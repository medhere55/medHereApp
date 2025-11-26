import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

export interface Interaction {
  drugs: string[];
  severity: 'high' | 'moderate' | 'low';
  description: string;
}

export interface InteractionResponse {
  interactions: Interaction[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})

export class MedicationService {
  private medicationsSubject = new BehaviorSubject<Medication[]>([]);
  public medications$: Observable<Medication[]> = this.medicationsSubject.asObservable();

  private backendUrl = 'http://127.0.0.1:5001';

  // FHIR server base URL & shared patient ID
  private fhirBase = "https://hapi.fhir.org/baseR4";
  private patientId = "group55-sharedpatient";
  private hasLoadedFromFHIR = false;

  constructor(private authService: AuthService, private http: HttpClient) {
    if (this.authService.isLoggedIn()) {
      this.refresh();
      this.loadMedicationsFromFHIRIfNeeded();
    }

    this.authService.currentUser$.subscribe(() => {
      if (this.authService.isLoggedIn()) {
        this.refresh();
        this.loadMedicationsFromFHIRIfNeeded();
      } else {
        this.medicationsSubject.next([]);
        this.hasLoadedFromFHIR = false;
      }
    });
  }

  checkInteractions(medications: Medication[]): Observable<InteractionResponse> {
    const drugNames = medications.map(m => m.name);
    return this.http.post<InteractionResponse>(`${this.backendUrl}/api/check-interactions`, { medications: drugNames });
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

  loadMedicationsFromFHIRIfNeeded(): void {
    // Only load from FHIR once, and only if no medications exist
    if (this.hasLoadedFromFHIR) {
      return;
    }

    const existingMeds = this.getMedications();
    if (existingMeds.length > 0) {
      this.hasLoadedFromFHIR = true;
      return;
    }

    this.loadMedicationsFromFHIR();
  }

  private loadMedicationsFromFHIR(): void {
    fetch(
      `${this.fhirBase}/MedicationRequest?patient=${this.patientId}&status=active&_pretty=true`
    )
      .then((result) => result.json())
      .then((data) => {
        if (!data.entry || data.entry.length === 0) {
          console.warn("No medications found from FHIR!");
          this.hasLoadedFromFHIR = true;
          return;
        }

        const fhirMedications = data.entry.map((entry: any, index: number) => {
          const r = entry.resource;
          const medConcept = r.medicationCodeableConcept;

          // medication name
          const medName =
            medConcept?.text ||
            medConcept?.coding?.[0]?.display ||
            "(Unknown medication)";

          // dosage info
          const dose = r.dosageInstruction?.[0];
          const doseQuantity = dose?.doseAndRate?.[0]?.doseQuantity;
          const dosageAmount = doseQuantity?.value || 0;
          const dosageUnit = doseQuantity?.unit || "mg";

          // frequency
          const repeat = dose?.timing?.repeat;
          const asNeeded = dose?.asNeededBoolean || false;
          let frequency = "Once daily";
          if (asNeeded) frequency = "As needed";
          else if (repeat?.frequency === 2) frequency = "Twice daily";
          else if (repeat?.frequency === 3) frequency = "Three times daily";
          else if (repeat?.frequency === 4) frequency = "Four times daily";

          // times
          const times = repeat?.timeOfDay || [];

          // reason
          const reason = r.reasonCode?.[0]?.text || "";

          // start date / end date / no end date
          const startDate = repeat?.boundsPeriod?.start || "";
          const endDate = repeat?.boundsPeriod?.end || "";
          const noEndDate = !endDate;

          // notes
          const notes = dose?.additionalInstruction?.[0]?.text || "";

          // ignore this
          let frequencyDisplay = frequency;

          // formatting dates for readability - not used due to error with other formatDate function**
          const formatDate = (d: string) => {
            if (!d) return "";
            const date = new Date(d);
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          };

          return {
            id: index + 1,
            name: medName,
            dosageAmount,
            dosageUnit,
            form: "Tablet",
            reason,
            frequency,
            times,
            startDate,
            endDate: endDate ? endDate : "",
            noEndDate,
            notes,
          } as Medication;
        });

        this.saveMedications(fhirMedications);
        this.hasLoadedFromFHIR = true;
        console.log(
          "Medications loaded successfully from FHIR!",
          fhirMedications
        );
      })
      .catch((err) => {
        console.error("Medication loading failed", err);
      });
  }
}

