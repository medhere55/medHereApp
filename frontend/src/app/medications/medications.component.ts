import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Medication {
  id: number;
  name: string;
  dosageAmount: number;
  dosageUnit: string;
  form: string;
  formOther?: string;
  reason: string;
  frequency: string;
  times: string[];
  startDate: string;
  endDate?: string;
  noEndDate: boolean;
  notes?: string;
}

@Component({
  selector: 'app-medications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medications.component.html',
  styleUrls: ['./medications.component.css']
})
export class MedicationsComponent implements OnInit {
  medications: Medication[] = [];
  selectedMedication: Medication | null = null;
  showNotesModal: boolean = false;
  showAddModal: boolean = false;

  // Form data
  medicationForm = {
    name: '',
    dosageAmount: null as number | null,
    dosageUnit: '',
    form: 'tablet',
    reason: '',
    frequency: 'Once daily',
    times: [''],
    startDate: '',
    endDate: '',
    noEndDate: false,
    notes: ''
  };

  ngOnInit(): void {
    this.loadMedications();
  }

  openNotesModal(med: Medication): void {
    this.selectedMedication = med;
    this.showNotesModal = true;
  }

  closeNotesModal(): void {
    this.showNotesModal = false;
    this.selectedMedication = null;
  }

  loadMedications(): void {
    // Mock data
    this.medications = [
      {
        id: 1,
        name: 'Tylenol',
        dosageAmount: 650,
        dosageUnit: 'mg',
        form: 'tablet',
        reason: 'Back pain',
        frequency: 'Once daily',
        times: ['08:00', '20:00'],
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        noEndDate: false,
        notes: 'Do not exceed 4 doses per day.'
      },
      {
        id: 2,
        name: 'Zyrtec',
        dosageAmount: 10,
        dosageUnit: 'mg',
        form: 'tablet',
        reason: 'Allergies',
        frequency: 'Once daily',
        times: ['08:00'],
        startDate: '2025-04-15',
        endDate: '2025-10-15',
        noEndDate: false,
        notes: 'May cause drowsiness.'
      },
      {
        id: 3,
        name: 'Advil',
        dosageAmount: 400,
        dosageUnit: 'mg',
        form: 'tablet',
        reason: 'Migraines',
        frequency: 'As needed',
        times: [],
        startDate: '2024-06-24',
        endDate: '',
        noEndDate: true,
        notes: 'Take at first sign of migraine.'
      }
    ];
  }

  formatDosage(med: Medication): string {
    return `${med.dosageAmount} ${med.dosageUnit}`;
  }

  formatFrequency(med: Medication): string {
    // If there are times, format them and append to frequency
    if (med.times && med.times.length > 0) {
      const formattedTimes = med.times.map(time => {
        if (time && time.includes(':')) {
          const [hours, minutes] = time.split(':');
          const hour = parseInt(hours, 10);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          return `${hour12}:${minutes} ${ampm}`;
        }
        return time;
      });
      return `${med.frequency} (${formattedTimes.join(' + ')})`;
    }
    return med.frequency;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  editMedication(med: Medication): void {
    // TODO: implement edit functionality
    alert(`Edit functionality to be implemented`);
  }

  deleteMedication(med: Medication): void {
    if (confirm(`Are you sure you want to delete ${med.name}?`)) {
      this.medications = this.medications.filter(m => m.id !== med.id);
    }
  }

  openAddModal(): void {
    this.resetForm();
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.medicationForm = {
      name: '',
      dosageAmount: null,
      dosageUnit: '',
      form: 'tablet',
      reason: '',
      frequency: 'Once daily',
      times: [''],
      startDate: '',
      endDate: '',
      noEndDate: false,
      notes: ''
    };
  }

  onFrequencyChange(): void {
    const freq = this.medicationForm.frequency;
    if (freq === 'Once daily') {
      this.medicationForm.times = [''];
    } else if (freq === 'Twice daily') {
      this.medicationForm.times = ['', ''];
    } else if (freq === 'Three times daily') {
      this.medicationForm.times = ['', '', ''];
    } else if (freq === 'Four times daily') {
      this.medicationForm.times = ['', '', '', ''];
    } else {
      // No times needed for "as needed" or "weekly" options 
      this.medicationForm.times = [];
    }
  }

  addMedication(): void {
    // Basic validation
    if (!this.medicationForm.name || !this.medicationForm.dosageAmount || 
        !this.medicationForm.dosageUnit || !this.medicationForm.startDate) {
      alert('Please fill in all required fields (Name, Dosage, Start Date)');
      return;
    }

    if (this.medicationForm.endDate && this.medicationForm.startDate > this.medicationForm.endDate) {
      alert('Please ensure the Start Date is prior to the End Date');
      return;
    }

    const newMedication: Medication = {
      id: Date.now(),
      name: this.medicationForm.name,
      dosageAmount: this.medicationForm.dosageAmount!,
      dosageUnit: this.medicationForm.dosageUnit,
      form: this.medicationForm.form,
      reason: this.medicationForm.reason || '',
      frequency: this.medicationForm.frequency,
      times: this.medicationForm.times.filter(t => t), // Remove empty times
      startDate: this.medicationForm.startDate,
      endDate: this.medicationForm.noEndDate ? undefined : this.medicationForm.endDate,
      noEndDate: this.medicationForm.noEndDate,
      notes: this.medicationForm.notes || undefined
    };

    this.medications.push(newMedication);
    this.closeAddModal();
  }
}
