import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {

  days: { date: number }[] = [];
  medications: Record<string, string[]> = {};

  // Map of medication names to colors
  medColors: { [key: string]: string } = {
    "Aspirin": "#FF5733",
    "Ibuprofen": "#33FF57",
    "Vitamin C": "#3357FF",
    "Metformin": "#F1C40F",
  };

  ngOnInit() {
    this.generateDays();
    this.seedMedications();
  }

  generateDays() {
    // Example: 7 days for one week
    this.days = Array.from({ length: 7 }, (_, i) => ({ date: i + 1 }));
  }

  seedMedications() {
    this.medications = {
      '1': ["Aspirin", "Ibuprofen"],
      '2': ["Metformin"],
      '5': ["Vitamin C", "Aspirin"],
      '7': ["Ibuprofen"],
    };
  }

  getMedsForDay(day: number): string[] {
    return this.medications[day] || [];
  }

  getMedColor(med: string): string {
    return this.medColors[med] || "#999"; // default gray if not mapped
  }

}