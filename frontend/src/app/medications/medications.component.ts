import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs";
import { MedicationService, Medication } from "../services/medication.service";

@Component({
  selector: "app-medications",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./medications.component.html",
  styleUrls: ["./medications.component.css"],
})
export class MedicationsComponent implements OnInit, OnDestroy {
  medications: Medication[] = [];
  selectedMedication: Medication | null = null;
  showNotesModal: boolean = false;
  showAddModal: boolean = false;
  showEditModal: boolean = false;
  editingMedicationId: number | null = null;
  private medicationsSubscription?: Subscription;

  // FHIR server base URL & shared patient ID
  private fhirBase = "https://hapi.fhir.org/baseR4";
  private patientId = "group55-sharedpatient";

  // Form data
  medicationForm = {
    name: "",
    dosageAmount: null as number | null,
    dosageUnit: "",
    form: "tablet",
    formOtherText: "",
    reason: "",
    frequency: "Once daily",
    frequencyOtherText: "",
    times: [""],
    startDate: "",
    endDate: "",
    noEndDate: false,
    notes: "",
  };

  constructor(
    private medicationService: MedicationService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.medicationsSubscription =
      this.medicationService.medications$.subscribe((meds) => {
        this.medications = [...meds];
        this.cd.detectChanges();
      });
    
    // Load data from medicationService
    this.medications = this.medicationService.getMedications();
    
    // Only load from FHIR medications on initial load
    if (this.medications.length === 0) {
      this.loadMedicationsFromFHIR();
    }
  }

  ngOnDestroy(): void {
    this.medicationsSubscription?.unsubscribe();
  }

  openNotesModal(med: Medication): void {
    this.selectedMedication = med;
    this.showNotesModal = true;
  }

  closeNotesModal(): void {
    this.showNotesModal = false;
    this.selectedMedication = null;
  }

  // load our medication data from public FHIR server
  loadMedicationsFromFHIR(): void {
    fetch(
      `${this.fhirBase}/MedicationRequest?patient=${this.patientId}&status=active&_pretty=true`
    )
      .then((result) => result.json())
      .then((data) => {
        if (!data.entry || data.entry.length === 0) {
          console.warn("No medications found from FHIR!");
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

        // Merge FHIR medications with existing local medications
        const existingMeds = this.medicationService.getMedications();
        const existingIds = new Set(existingMeds.map((m: Medication) => m.id));        
        const newFhirMeds = fhirMedications.filter((fhir: Medication) => !existingIds.has(fhir.id));
        const mergedMedications = [...newFhirMeds, ...existingMeds];

        this.medicationService.saveMedications(mergedMedications);
        console.log(
          "Medications loaded successfully from FHIR and merged with local!",
          mergedMedications
        );
      })
      .catch((err) => {
        console.error("Medication loading failed", err);
      });
  }

  formatDosage(med: Medication): string {
    return `${med.dosageAmount} ${med.dosageUnit}`;
  }

  formatFrequency(med: Medication): string {
    // If there are times, format them and append to frequency
    if (med.times && med.times.length > 0) {
      const formattedTimes = med.times.map((time) => {
        if (time && time.includes(":")) {
          const [hours, minutes] = time.split(":");
          const hour = parseInt(hours, 10);
          const ampm = hour >= 12 ? "PM" : "AM";
          const hour12 = hour % 12 || 12;
          return `${hour12}:${minutes} ${ampm}`;
        }
        return time;
      });
      return `${med.frequency} (${formattedTimes.join(" + ")})`;
    }
    return med.frequency;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return "";
    // Use local time to fix off by one errors
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  editMedication(med: Medication): void {
    const formOptions = [
      "tablet",
      "capsule",
      "liquid",
      "injection",
      "ointment",
      "patch",
      "inhaler",
    ];
    const isFormOther = !formOptions.includes(med.form.toLowerCase());

    const frequencyOptions = [
      "Once daily",
      "Twice daily",
      "Three times daily",
      "Four times daily",
      "As needed",
    ];
    const isFrequencyOther = !frequencyOptions.includes(med.frequency);

    this.medicationForm = {
      name: med.name,
      dosageAmount: med.dosageAmount,
      dosageUnit: med.dosageUnit,
      form: isFormOther ? "Other" : med.form,
      formOtherText: isFormOther ? med.form : "",
      reason: med.reason || "",
      frequency: isFrequencyOther ? "Other" : med.frequency,
      frequencyOtherText: isFrequencyOther ? med.frequency : "",
      times: [],
      startDate: med.startDate,
      endDate: med.endDate || "",
      noEndDate: med.noEndDate,
      notes: med.notes || "",
    };

    // Set up time(s) fields
    this.onFrequencyChange();

    // Populate stored times
    if (med.times && med.times.length > 0) {
      this.medicationForm.times = [...med.times];
    }

    this.editingMedicationId = med.id;
    this.showEditModal = true;
  }

  deleteMedication(med: Medication): void {
    if (confirm(`Are you sure you want to delete ${med.name}?`)) {
      const updatedMeds = this.medications.filter((m) => m.id !== med.id);
      this.medicationService.saveMedications(updatedMeds);
    }
  }

  openAddModal(): void {
    this.resetForm();
    this.editingMedicationId = null;
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.resetForm();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingMedicationId = null;
    this.resetForm();
  }

  resetForm(): void {
    this.medicationForm = {
      name: "",
      dosageAmount: null,
      dosageUnit: "",
      form: "tablet",
      formOtherText: "",
      reason: "",
      frequency: "Once daily",
      frequencyOtherText: "",
      times: [""],
      startDate: "",
      endDate: "",
      noEndDate: false,
      notes: "",
    };
  }

  onFrequencyChange(): void {
    const freq = this.medicationForm.frequency;
    if (freq === "Once daily") {
      this.medicationForm.times = [""];
    } else if (freq === "Twice daily") {
      this.medicationForm.times = ["", ""];
    } else if (freq === "Three times daily") {
      this.medicationForm.times = ["", "", ""];
    } else if (freq === "Four times daily") {
      this.medicationForm.times = ["", "", "", ""];
    } else {
      // No times needed for "as needed" or "weekly" options
      this.medicationForm.times = [];
    }
  }

  private validateForm(): boolean {
    if (
      !this.medicationForm.name ||
      !this.medicationForm.dosageAmount ||
      !this.medicationForm.dosageUnit ||
      !this.medicationForm.startDate
    ) {
      alert("Please fill in all required fields (Name, Dosage, Start Date)");
      return false;
    }

    if (
      this.medicationForm.form === "Other" &&
      !this.medicationForm.formOtherText
    ) {
      alert("Please specify the medication form");
      return false;
    }

    if (
      this.medicationForm.frequency === "Other" &&
      !this.medicationForm.frequencyOtherText
    ) {
      alert("Please specify the frequency");
      return false;
    }

    if (
      this.medicationForm.endDate &&
      this.medicationForm.startDate > this.medicationForm.endDate
    ) {
      alert("Please ensure the Start Date is prior to the End Date");
      return false;
    }

    return true;
  }

  private createMedicationFromForm(id?: number): Medication {
    return {
      id: id || Date.now(),
      name: this.medicationForm.name,
      dosageAmount: this.medicationForm.dosageAmount!,
      dosageUnit: this.medicationForm.dosageUnit,
      form:
        this.medicationForm.form === "Other"
          ? this.medicationForm.formOtherText
          : this.medicationForm.form,
      reason: this.medicationForm.reason || "",
      frequency:
        this.medicationForm.frequency === "Other"
          ? this.medicationForm.frequencyOtherText
          : this.medicationForm.frequency,
      times: this.medicationForm.times.filter((t) => t), // Remove empty times
      startDate: this.medicationForm.startDate,
      endDate: this.medicationForm.noEndDate
        ? undefined
        : this.medicationForm.endDate,
      noEndDate: this.medicationForm.noEndDate,
      notes: this.medicationForm.notes || undefined,
    };
  }

  addMedication(): void {
    if (!this.validateForm()) {
      return;
    }

    const newMedication = this.createMedicationFromForm();
    const updatedMeds = [...this.medications, newMedication];
    this.medicationService.saveMedications(updatedMeds);
    this.closeAddModal();
  }

  updateMedication(): void {
    if (!this.validateForm()) {
      return;
    }

    const index = this.medications.findIndex(
      (m) => m.id === this.editingMedicationId!
    );

    if (index !== -1) {
      const updatedMedication = this.createMedicationFromForm(
        this.editingMedicationId!
      );
      const updatedMeds = [...this.medications];
      updatedMeds[index] = updatedMedication;
      this.medicationService.saveMedications(updatedMeds);
      this.closeEditModal();
    } else {
      alert("Error: Medication not found");
    }
  }
}
