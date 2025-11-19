import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicationService, Medication } from '../services/medication.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule], // needed for *ngFor, ngClass
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'] // use CSS for simplicity
})

export class DashboardComponent implements OnInit {
  medications = [
    { name: 'Lisinopril', dose: '10 mg', time: '8:00 AM' },
    { name: 'Metformin', dose: '500 mg', time: '8:00 AM' },
    { name: 'Metformin', dose: '500 mg', time: '8:00 PM' },
    { name: 'Lipitor', dose: '20 mg', time: '9:00 PM' }
  ];

  userMedications: Medication[] = [];

  checked: { [key: string]: boolean } = {};

  reminders = [
    { icon: '⚠️', text: 'You missed your 8:00 AM Lisinopril dose today.', type: 'warning' },
    { icon: '⏰', text: 'Your upcoming Metformin dose is at 8:00 PM today.', type: 'info' }
  ];

  upcomingDoses = [
    { name: 'Metformin', dose: '500 mg', time: 'Today, 8:00 PM' },
    { name: 'Lipitor', dose: '20 mg', time: 'Today, 9:00 PM' },
    { name: 'Lisinopril', dose: '10 mg', time: 'Tomorrow, 8:00 AM' }
  ];

  interactions = [
    {
      icon: '⚠️',
      text: 'Lisinopril ⇄ Metformin — may lower blood sugar; monitor for dizziness or sweating.',
      status: 'warning'
    },
    { icon: '✅', text: 'Lisinopril ⇄ Lipitor — No known interaction.', status: 'ok' },
    { icon: '✅', text: 'Lipitor ⇄ Metformin — No known interaction.', status: 'ok' }
  ];

  constructor(private medicationService: MedicationService) {}

  ngOnInit(): void {
    this.userMedications = this.medicationService.getMedications();
    console.log("in dashboard component, loading user medications");
    console.log(this.userMedications);
    this.medicationService.medications$.subscribe(meds => {
      this.userMedications = meds;
    });
  }

  toggleMedication(medName: string, event: any) {
    this.checked[medName] = event.target.checked;
  }

  markAllTaken() {
    for (const med of this.medications) {
      this.checked[med.name] = true;
    }
  }
}
