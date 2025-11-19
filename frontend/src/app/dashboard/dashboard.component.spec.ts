import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  medications = [
    { name: 'Lisinopril', dose: '10 mg', time: '8:00 AM' },
    { name: 'Metformin', dose: '500 mg', time: '8:00 AM' },
    { name: 'Metformin', dose: '500 mg', time: '8:00 PM' },
    { name: 'Lipitor', dose: '20 mg', time: '9:00 PM' }
  ];

  checked: Record<string, boolean> = {};

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
    { icon: '⚠️', text: 'Lisinopril ⇄ Metformin — may lower blood sugar; monitor for dizziness or sweating.', status: 'warning' },
    { icon: '✅', text: 'Lisinopril ⇄ Lipitor — No known interaction.', status: 'safe' },
    { icon: '✅', text: 'Lipitor ⇄ Metformin — No known interaction.', status: 'safe' }
  ];

  ngOnInit(): void {
    this.restoreCheckedState();
  }

  toggleMedication(name: string, event: Event) {
    const input = event.target as HTMLInputElement;
    this.checked[name] = input.checked;
    localStorage.setItem(`medcheck_${name}`, JSON.stringify(input.checked));
  }

  restoreCheckedState() {
    this.medications.forEach(med => {
      const stored = localStorage.getItem(`medcheck_${med.name}`);
      if (stored) this.checked[med.name] = JSON.parse(stored);
    });
  }

  markAllTaken() {
    this.medications.forEach(med => {
      this.checked[med.name] = true;
      localStorage.setItem(`medcheck_${med.name}`, 'true');
    });
  }
}
