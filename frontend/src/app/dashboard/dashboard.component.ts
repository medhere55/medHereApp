import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicationService, Medication } from '../services/medication.service';

interface DashboardMedication {
  id: number;
  name: string;
  dose: string;
  time: string;          // formatted as HH:MM AM/PM or empty
  form: string;
  reason: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  noEndDate: boolean;
  notes?: string;
  doseKey: string;       // unique key for this specific dose (id + time)
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
  checked: Record<string, boolean> = {};  // key is doseKey
  reminders: { icon: string; text: string; type: string }[] = [];
  upcomingDoses: DashboardMedication[] = [];
  interactions: { icon: string; text: string; status: string }[] = [];

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
    this.medications = meds.flatMap(med =>
      med.times.length
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
        : [{
          id: med.id,
          name: med.name,
          dose: `${med.dosageAmount} ${med.dosageUnit}`,
          time: '', // no associated time
          form: med.form,
          reason: med.reason,
          frequency: med.frequency,
          startDate: med.startDate,
          endDate: med.endDate,
          noEndDate: med.noEndDate,
          notes: med.notes,
          doseKey: `${med.id}_no_time`
        }]
    );

    // Sort doses: timed first ascending, then no-time doses last
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
      if (med.time) { // only mark timed doses
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

      // Parse AM/PM correctly
      const match = med.time.match(/(\d+):(\d+) (AM|PM)/);
      if (!match) return null;
      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const ampm = match[3];
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      const doseTime = new Date();
      doseTime.setHours(hour, minute, 0, 0);

      // Only show missed doses
      if (doseTime < now && !this.checked[med.doseKey]) {
        return { icon: '⚠️', text: `You missed your ${med.time} ${med.name} dose today.`, type: 'warning' };
      }

      return null; // don't show upcoming doses here
    }).filter(Boolean) as any[];
  }

  generateUpcomingDoses() {
    const now = new Date();
    this.upcomingDoses = this.medications.filter(med => {
      if (this.checked[med.doseKey]) return false;
      if (!med.time.includes(':')) return true; // keep no-time doses
      // Parse AM/PM correctly
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
    this.interactions = [
      { icon: '⚠️', text: 'Lisinopril ⇄ Metformin — may lower blood sugar; monitor for dizziness or sweating.', status: 'warning' },
      { icon: '✅', text: 'Lisinopril ⇄ Lipitor — No known interaction.', status: 'safe' },
      { icon: '✅', text: 'Lipitor ⇄ Metformin — No known interaction.', status: 'safe' }
    ];
  }

  get todaysScheduledMedications(): DashboardMedication[] {
    return this.medications.filter(med => med.time.includes(':'));
  }
}