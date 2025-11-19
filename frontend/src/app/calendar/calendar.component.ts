import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicationService, Medication } from '../services/medication.service';

interface CalendarDay {
  date: number;
  fullDate: string;
  jsDate: Date;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})

export class CalendarComponent implements OnInit {
  days: CalendarDay[] = [];
  monthDays: CalendarDay[][] = []; // for month view
  medications: Record<string, string[]> = {};
  userMedications: Medication[] = [];
  medColors: Record<string, string> = {
    "Aspirin": "#FF5733",
    "Ibuprofen": "#33FF57",
    "Vitamin C": "#3357FF",
    "Metformin": "#F1C40F",
  };

  currentWeekStart: Date = new Date();
  currentMonth: Date = new Date();
  viewMode: 'day' | 'week' | 'month' = 'week';

  constructor(private medicationService: MedicationService) {}

  ngOnInit() {
    this.generateDays(this.currentWeekStart);
    this.generateMonthDays(this.currentMonth);
    this.seedMedications();

    this.userMedications = this.medicationService.getMedications();
    // console.log("in calendar component, loading user medications");
    // console.log(this.userMedications);
    this.medicationService.medications$.subscribe(meds => {
      this.userMedications = meds;
    });
  }

  /** WEEK VIEW **/
  generateDays(referenceDate: Date) {
    const weekStartDay = 0; // Sunday start
    const dayOfWeek = referenceDate.getDay();
    const diff = dayOfWeek - weekStartDay;

    const startOfWeek = new Date(referenceDate);
    startOfWeek.setDate(referenceDate.getDate() - diff);
    this.currentWeekStart = startOfWeek;

    this.days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        date: d.getDate(),
        fullDate: d.toISOString().split("T")[0],
        jsDate: d
      };
    });
  }

  /** MONTH VIEW **/
  generateMonthDays(referenceDate: Date) {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();

    const days: CalendarDay[] = [];

    // Fill in previous month's trailing days (for grid alignment)
    for (let i = 0; i < firstDayOfWeek; i++) {
      const d = new Date(year, month, i - firstDayOfWeek + 1);
      days.push({
        date: d.getDate(),
        fullDate: d.toISOString().split("T")[0],
        jsDate: d
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: i,
        fullDate: d.toISOString().split("T")[0],
        jsDate: d
      });
    }

    // Make 6 weeks grid (6 rows × 7 days)
    while (days.length % 7 !== 0) {
      const d = new Date(year, month + 1, days.length - lastDay.getDate() + 1);
      days.push({
        date: d.getDate(),
        fullDate: d.toISOString().split("T")[0],
        jsDate: d
      });
    }

    this.monthDays = [];
    for (let i = 0; i < days.length; i += 7) {
      this.monthDays.push(days.slice(i, i + 7));
    }
  }

  /** DATA **/
  seedMedications() {
    this.medications = {
      [this.days[0].fullDate]: ["Aspirin", "Ibuprofen"],
      [this.days[1].fullDate]: ["Metformin"],
      [this.days[4].fullDate]: ["Vitamin C", "Aspirin"],
      [this.days[6].fullDate]: ["Ibuprofen"]
    };
  }

  getMedsForDay(day: CalendarDay): string[] {
    return this.medications[day.fullDate] || [];
  }

  getMedColor(med: string): string {
    return this.medColors[med] || "#999";
  }

  isPastDay(day: CalendarDay): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(day.jsDate);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }

  isToday(day: CalendarDay): boolean {
    const today = new Date();
    return (
      day.jsDate.getFullYear() === today.getFullYear() &&
      day.jsDate.getMonth() === today.getMonth() &&
      day.jsDate.getDate() === today.getDate()
    );
  }

  /** NAVIGATION **/
  currentDay: Date = new Date(); // add this

  prevPeriod() {
    if (this.viewMode === 'day') {
      this.currentDay.setDate(this.currentDay.getDate() - 1);
    } else if (this.viewMode === 'week') {
      const prev = new Date(this.currentWeekStart);
      prev.setDate(prev.getDate() - 7);
      this.generateDays(prev);
    } else if (this.viewMode === 'month') {
      const prev = new Date(this.currentMonth);
      prev.setMonth(prev.getMonth() - 1);
      this.currentMonth = prev;
      this.generateMonthDays(prev);
    }
  }

  nextPeriod() {
    if (this.viewMode === 'day') {
      this.currentDay.setDate(this.currentDay.getDate() + 1);
    } else if (this.viewMode === 'week') {
      const next = new Date(this.currentWeekStart);
      next.setDate(next.getDate() + 7);
      this.generateDays(next);
    } else if (this.viewMode === 'month') {
      const next = new Date(this.currentMonth);
      next.setMonth(next.getMonth() + 1);
      this.currentMonth = next;
      this.generateMonthDays(next);
    }
  }
}