import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Medication {
  id: number;
  name: string;
  dosageAmount: number;
  dosageUnit: string;
  form: string;
  reason: string;
  frequency: string;
  times: string[];
  startDate: string;
  endDate?: string;
  noEndDate: boolean;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})

export class MedicationService {
  private medicationsSubject = new BehaviorSubject<Medication[]>([]);
  public medications$: Observable<Medication[]> = this.medicationsSubject.asObservable();

  constructor(private authService: AuthService) {
    if (this.authService.isLoggedIn()) {
      this.refresh();
    }

    this.authService.currentUser$.subscribe(() => {
      if (this.authService.isLoggedIn()) {
        this.refresh();
      } else {
        this.medicationsSubject.next([]);
      }
    });
  }

  private getStorageKey(): string {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }
    return `medications_${currentUser.id}`;
  }

  getMedications(): Medication[] {
    try {
      const key = this.getStorageKey();
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) as Medication[] : [];
    } catch {
      return [];
    }
  }

  saveMedications(medications: Medication[]): void {
    const key = this.getStorageKey();
    localStorage.setItem(key, JSON.stringify(medications));
    this.medicationsSubject.next(medications);
  }

  refresh(): void {
    this.medicationsSubject.next(this.getMedications());
  }
}

