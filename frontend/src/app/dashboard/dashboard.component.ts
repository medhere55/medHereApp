// import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-dashboard',
//   standalone: true,
//   imports: [CommonModule],
//   template: `
//     <p>
//       dashboard works!
//     </p>
//   `,
//   styleUrls: ['./dashboard.component.css']
// })
// export class DashboardComponent {

// }



import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Medication {
  id: string;
  name: string;
  dose?: string;
  scheduleTime?: string;
  days?: string[];
  notes?: string;
  refillDate?: string; // ISO date string e.g. "2025-11-08"
}

const STORAGE_KEY_PREFIX = 'medcheck_';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  medications: Medication[] = [];
  checked: Record<string, boolean> = {};
  loading = true;
  error: string | null = null;

  private allMedications: Medication[] = [
    { id: '1', name: 'Lisinopril', dose: '10 mg', scheduleTime: '08:00', refillDate: '2025-11-09', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
    { id: '2', name: 'Atorvastatin', dose: '20 mg', scheduleTime: '20:00', refillDate: '2025-12-01', days: ['mon', 'wed', 'fri'] },
    { id: '3', name: 'Vitamin D', dose: '1000 IU', scheduleTime: '12:00', days: ['sun', 'sat'] },
  ];

  constructor() { }

  ngOnInit(): void {
    this.fetchForToday();
  }

  fetchForToday(): void {
    this.loading = true;
    this.error = null;
    const today = new Date();
    const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today.getDay()];

    try {
      this.medications = this.allMedications
        .filter(m => !m.days || m.days.length === 0 || m.days.includes(weekday))
        .sort((a, b) => (a.scheduleTime || '').localeCompare(b.scheduleTime || ''));
      this.loadCheckedStates();
      this.loading = false;
    } catch (e) {
      this.error = 'Failed to load medications.';
      this.loading = false;
    }
  }

  private storageKey(id: string): string {
    const keyDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return `${STORAGE_KEY_PREFIX}${keyDate}_${id}`;
  }

  private loadCheckedStates(): void {
    this.checked = {};
    for (const m of this.medications) {
      const key = this.storageKey(m.id);
      try {
        const raw = localStorage.getItem(key);
        this.checked[m.id] = raw === '1';
      } catch {
        this.checked[m.id] = false;
      }
    }
  }

  toggle(med: Medication): void {
    const id = med.id;
    this.checked[id] = !this.checked[id];
    try {
      localStorage.setItem(this.storageKey(id), this.checked[id] ? '1' : '0');
    } catch (e) {
      console.warn('Could not save medication state', e);
    }
  }

  markAllTaken(): void {
    for (const m of this.medications) {
      this.checked[m.id] = true;
      try { localStorage.setItem(this.storageKey(m.id), '1'); } catch { }
    }
  }

  clearToday(): void {
    for (const m of this.medications) {
      this.checked[m.id] = false;
      try { localStorage.setItem(this.storageKey(m.id), '0'); } catch { }
    }
  }
  
  isMissed(med: Medication): boolean {
    if (!med.scheduleTime) return false;
    const [hours, minutes] = med.scheduleTime.split(':').map(Number);
    const now = new Date();
    const medTime = new Date();
    medTime.setHours(hours, minutes, 0, 0);
    return now > medTime && !this.checked[med.id];
  }

  getRefillSoonList(): Medication[] {
    const today = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);

    return this.medications.filter(m => {
      if (!m.refillDate) return false;
      const refill = new Date(m.refillDate);
      return refill >= today && refill <= oneWeekFromNow;
    });
  }
}
