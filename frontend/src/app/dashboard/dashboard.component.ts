import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicationService, Medication, InteractionResponse, Interaction } from '../services/medication.service';

interface DashboardMedication {
  id: number;
  name: string;
  dose: string;
  time: string;
  form: string;
  reason: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  noEndDate: boolean;
  notes?: string;
  doseKey: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  medications: DashboardMedication[] = [];
  checked: Record<string, boolean> = {};
  reminders: { icon: string; text: string; type: string }[] = [];
  upcomingDoses: DashboardMedication[] = [];
  interactions: InteractionResponse | null = null;
  interactionError: string | null = null;

  constructor(private medicationService: MedicationService) { }

  ngOnInit(): void {
    this.loadMedications();

    this.medicationService.medications$.subscribe((meds: Medication[]) => {
      this.mapMedications(meds);
      this.restoreCheckedState();
      this.generateReminders();
      this.generateUpcomingDoses();
      this.generateInteractions();
    });
  }

  private loadMedications(): void {
    const meds = this.medicationService.getMedications();
    this.mapMedications(meds);
    this.restoreCheckedState();
    this.generateReminders();
    this.generateUpcomingDoses();
    this.generateInteractions();
  }

  private mapMedications(meds: Medication[]): void {
    // Filter only today's medications
    const todayMeds = meds.filter(med => this.isMedicationActiveToday(med));
    
    this.medications = todayMeds.flatMap(med =>
      med.times && med.times.length
        ? med.times.map(time => ({
          id: med.id,
          name: med.name,
          dose: `${med.dosageAmount} ${med.dosageUnit}`,
          time: this.formatTime(time),
          form: med.form,
          reason: med.reason,
          frequency: med.frequency,
          startDate: med.startDate,
          endDate: med.endDate,
          noEndDate: med.noEndDate,
          notes: med.notes,
          doseKey: `${med.id}_${time}`
        }))
        : [({
          id: med.id,
          name: med.name,
          dose: `${med.dosageAmount} ${med.dosageUnit}`,
          time: '',
          form: med.form,
          reason: med.reason,
          frequency: med.frequency,
          startDate: med.startDate,
          endDate: med.endDate,
          noEndDate: med.noEndDate,
          notes: med.notes,
          doseKey: `${med.id}_no_time`
        } as DashboardMedication)]
    );

    this.medications.sort((a, b) => {
      const aHasTime = a.time.includes(':');
      const bHasTime = b.time.includes(':');
      if (!aHasTime && !bHasTime) return 0;
      if (!aHasTime) return 1;
      if (!bHasTime) return -1;
      return this.parseTimeToMinutes(a.time) - this.parseTimeToMinutes(b.time);
    });
  }

  private formatTime(timeStr: string): string {
    if (!timeStr.includes(':')) return timeStr;
    const [hourStr, minuteStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  }

  private parseTimeToMinutes(timeStr: string): number {
    const match = timeStr.match(/(\d+):(\d+) (AM|PM)/);
    if (!match) return 0;
    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const ampm = match[3];
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  toggleMedication(doseKey: string, event: Event) {
    const input = event.target as HTMLInputElement;
    this.checked[doseKey] = input.checked;
    localStorage.setItem(`medcheck_${doseKey}`, JSON.stringify(input.checked));
    this.generateReminders();
    this.generateUpcomingDoses();
  }

  restoreCheckedState() {
    this.medications.forEach(med => {
      const stored = localStorage.getItem(`medcheck_${med.doseKey}`);
      this.checked[med.doseKey] = stored ? JSON.parse(stored) : false;
    });
  }

  markAllTaken() {
    this.medications.forEach(med => {
      if (med.time) {
        this.checked[med.doseKey] = true;
        localStorage.setItem(`medcheck_${med.doseKey}`, 'true');
      }
    });
    this.generateReminders();
    this.generateUpcomingDoses();
  }

  generateReminders() {
    const now = new Date();
    this.reminders = this.medications.map(med => {
      if (!med.time.includes(':')) return null;

      const match = med.time.match(/(\d+):(\d+) (AM|PM)/);
      if (!match) return null;
      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const ampm = match[3];
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      const doseTime = new Date();
      doseTime.setHours(hour, minute, 0, 0);

      if (doseTime < now && !this.checked[med.doseKey]) {
        return { icon: '⚠️', text: `You missed your ${med.time} ${med.name} dose today.`, type: 'warning' };
      }

      return null;
    }).filter(Boolean) as any[];
  }

  generateUpcomingDoses() {
    const now = new Date();
    this.upcomingDoses = this.medications.filter(med => {
      if (this.checked[med.doseKey]) return false;
      if (!med.time.includes(':')) return true;
      const match = med.time.match(/(\d+):(\d+) (AM|PM)/);
      if (!match) return true;
      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const ampm = match[3];
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const doseTime = new Date();
      doseTime.setHours(hour, minute, 0, 0);
      return doseTime >= now;
    });
  }

  generateInteractions() {
    this.interactions = null;
    this.interactionError = null;

    const allMeds = this.medicationService.getMedications();
    const todayMeds = allMeds.filter(med => this.isMedicationActiveToday(med));

    if (todayMeds.length < 2) {
      return;
    }

    this.medicationService.checkInteractions(todayMeds).subscribe({
      next: (response) => {
        this.interactions = response || null;
      },
      error: (err) => {
        console.error('Error checking interactions:', err);
        this.interactionError = err?.error?.error || 'An unknown error occurred. Please ensure the backend is running.';
        this.interactions = null;
      },
    });
  }

  get todaysScheduledMedications(): DashboardMedication[] {
    return this.medications.filter(med => med.time && med.time.includes(':'));
  }

  private isMedicationActiveToday(med: Medication): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = this.parseDateLocal(med.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    if (today < startDate) {
      return false;
    }
    
    if (med.noEndDate || !med.endDate) {
      return true;
    }
    
    const endDate = this.parseDateLocal(med.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    return today <= endDate;
  }

  private parseDateLocal(dateStr: string): Date {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
}
