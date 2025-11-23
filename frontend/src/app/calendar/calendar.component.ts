import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicationService, Medication } from '../services/medication.service';

interface CalendarDay {
  date: number;
  fullDate: string;
  jsDate: Date;
}

interface CalendarMed {
  name: string;
  time: string;
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
  monthDays: CalendarDay[][] = [];
  currentDay: Date = new Date();
  currentWeekStart: Date = new Date();
  currentMonth: Date = new Date();
  viewMode: 'day' | 'week' | 'month' = 'week';

  // Day view helpers
  hours: number[] = Array.from({ length: 24 }, (_, i) => i);
  currentCalendarDay: CalendarDay = {
    date: new Date().getDate(),
    fullDate: new Date().toISOString().split("T")[0],
    jsDate: new Date(),
  };

  // Medications
  userMedications: Medication[] = [];
  medColors: Record<string, string> = {};
  colorList: string[] = [
    "#FF0000", "#008000", "#0000FF", "#FFFF00", "#00FFFF",
    "#FF00FF", "#FFA500", "#90EE90", "#4B0082",
  ];

  constructor(private medicationService: MedicationService) { }

  ngOnInit() {
    this.userMedications = this.medicationService.getMedications();
    this.assignColors();
    this.generateCalendar();

    this.medicationService.medications$.subscribe((meds) => {
      this.userMedications = meds;
      this.assignColors();
      this.generateCalendar();
    });
  }

  changeView(mode: "day" | "week" | "month") {
    this.viewMode = mode;
    if (mode === "day") this.currentDay = new Date();
    if (mode === "week") this.currentWeekStart = new Date();
    if (mode === "month") this.currentMonth = new Date(this.currentDay);
    this.generateCalendar();
  }

  prevPeriod() {
    if (this.viewMode === "day") {
      this.currentDay = new Date(this.currentDay.getFullYear(), this.currentDay.getMonth(), this.currentDay.getDate() - 1);
    } else if (this.viewMode === "week") {
      this.currentWeekStart = new Date(this.currentWeekStart.getFullYear(), this.currentWeekStart.getMonth(), this.currentWeekStart.getDate() - 7);
    } else if (this.viewMode === "month") {
      this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    }
    this.generateCalendar();
  }

  nextPeriod() {
    if (this.viewMode === "day") {
      this.currentDay = new Date(this.currentDay.getFullYear(), this.currentDay.getMonth(), this.currentDay.getDate() + 1);
    } else if (this.viewMode === "week") {
      this.currentWeekStart = new Date(this.currentWeekStart.getFullYear(), this.currentWeekStart.getMonth(), this.currentWeekStart.getDate() + 7);
    } else if (this.viewMode === "month") {
      this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    }
    this.generateCalendar();
  }

  generateCalendar() {
    if (this.viewMode === "day") this.generateDay();
    else if (this.viewMode === "week") this.generateWeek();
    else if (this.viewMode === "month") this.generateMonth();
  }

  generateDay() {
    this.currentCalendarDay = {
      date: this.currentDay.getDate(),
      fullDate: this.currentDay.toISOString().split("T")[0],
      jsDate: new Date(this.currentDay),
    };
  }

  generateWeek() {
    const start = this.getStartOfWeek(this.currentWeekStart);
    this.days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      this.days.push({
        date: d.getDate(),
        fullDate: d.toISOString().split("T")[0],
        jsDate: d
      });
    }
  }

  generateMonth() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const start = this.getStartOfWeek(firstDay);
    const end = this.getEndOfWeek(lastDay);

    const weeks: CalendarDay[][] = [];
    let current = new Date(start);

    while (current <= end) {
      const week: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        week.push({
          date: current.getDate(),
          fullDate: current.toISOString().split("T")[0],
          jsDate: new Date(current),
        });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }

    this.monthDays = weeks;
  }

  getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  getEndOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + (6 - d.getDay()));
    return d;
  }

  getSingleMedicationDates(med: Medication): Date[] {
    const dates: Date[] = [];
    const start = this.parseDateLocal(med.startDate);
    const end = med.endDate && !med.noEndDate ? this.parseDateLocal(med.endDate) : new Date(start.getFullYear() + 5, 11, 31);

    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current)); // ONE entry per day
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  getMedsForDay(day: CalendarDay): CalendarMed[] {
    return this.userMedications.flatMap((med) => {
      const medDates = this.getSingleMedicationDates(med);
      return medDates
        .filter(d =>
          d.getFullYear() === day.jsDate.getFullYear() &&
          d.getMonth() === day.jsDate.getMonth() &&
          d.getDate() === day.jsDate.getDate()
        )
        .flatMap(() => {
          // Use actual med.times, no multiplication by frequency
          if (!med.times || med.times.length === 0) return [{ name: med.name, time: "00:00" }];
          return med.times.map(t => ({ name: med.name, time: t || "00:00" }));
        });
    });
  }

  assignColors() {
    this.userMedications.forEach((med, i) => {
      this.medColors[med.name] = this.colorList[i % this.colorList.length];
    });
  }

  getMedColor(name: string) {
    return this.medColors[name] || "#000";
  }

  /* -------------------- HELPERS -------------------- */
  isToday(day: CalendarDay) {
    const now = new Date();
    return day.jsDate.getFullYear() === now.getFullYear() &&
      day.jsDate.getMonth() === now.getMonth() &&
      day.jsDate.getDate() === now.getDate();
  }

  isPastDay(day: CalendarDay) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return day.jsDate < today;
  }

  formatHour(hour: number): string {
    return hour.toString().padStart(2, "0");
  }

  private parseDateLocal(dateStr: string): Date {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
}