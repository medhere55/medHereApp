import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService, User } from "../services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  password: string = "";
  errorMessage: string = "";

  // FHIR server base URL & shared patient ID
  private fhirBase: string = "https://hapi.fhir.org/baseR4";
  private patientId: string = "group55-sharedpatient";

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Load users from JSON
    fetch("/assets/users.json")
      .then((response) => response.json())
      .then((data) => {
        this.users = data;
      })
      .catch((error) => {
        console.error("Error loading users:", error);
      });
  }

  onLogin(): void {
    if (!this.selectedUser) {
      this.errorMessage = "Please select a user";
      return;
    }

    if (!this.password) {
      this.errorMessage = "Please enter a password";
      return;
    }

    // For this demo, any password is accepted
    this.errorMessage = "";
    this.authService.login(this.selectedUser);

    // upload  FHIR data on login
    this.uploadFHIRBundleIfMissing();
  }
  // reset/upload FHIR data (3 default medications) to public HAPI FHIR server
  private uploadFHIRBundleIfMissing(): void {
    console.log("Resetting FHIR data...");

    const bundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        // delete all old MedicationRequests for this patient
        {
          request: {
            method: "DELETE",
            url: `MedicationRequest?patient=${this.patientId}`,
          },
        },

        // create or replace patient
        {
          resource: {
            resourceType: "Patient",
            id: this.patientId,
            name: [
              {
                use: "official",
                family: "SharedPatient",
                given: ["Group55"],
              },
            ],
            gender: "female",
            birthDate: "1990-01-01",
          },
          request: { method: "PUT", url: `Patient/${this.patientId}` },
        },

        // tylenol
        {
          resource: {
            resourceType: "MedicationRequest",
            id: "med1",
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
              text: "Tylenol", // generic name
              coding: [
                {
                  system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                  code: "123456", // placeholder code
                  display: "Tylenol 650 mg Tablet", // name here must match rxnorm code
                },
              ],
            },
            subject: { reference: `Patient/${this.patientId}` },
            authoredOn: "2024-12-31",
            dosageInstruction: [
              {
                text: "Take 1 tablet (650 mg) twice daily for back pain at 8:00 AM and 8:00 PM",
                additionalInstruction: [
                  {
                    text: "Do not exceed 4 doses per day.",
                  },
                ],
                timing: {
                  repeat: {
                    frequency: 2,
                    period: 1,
                    periodUnit: "d",
                    timeOfDay: ["08:00", "20:00"],
                    boundsPeriod: {
                      start: "2024-12-31",
                      end: "2025-12-30",
                    },
                  },
                },
                doseAndRate: [{ doseQuantity: { value: 650, unit: "mg" } }],
              },
            ],
            reasonCode: [{ text: "Back pain" }],
          },
          request: { method: "PUT", url: "MedicationRequest/med1" },
        },

        // zyrtec
        {
          resource: {
            resourceType: "MedicationRequest",
            id: "med2",
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
              text: "Zyrtec", // generic name
              coding: [
                {
                  system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                  code: "123456", //placeholder code
                  display: "Zyrtec 10 mg Tablet", // name here must match rxnorm code
                },
              ],
            },
            subject: { reference: `Patient/${this.patientId}` },
            authoredOn: "2025-04-14",
            dosageInstruction: [
              {
                text: "Take 1 tablet (10 mg) once daily at 8:00 AM for allergies",
                additionalInstruction: [
                  {
                    text: "May cause drowsiness.",
                  },
                ],
                timing: {
                  repeat: {
                    frequency: 1,
                    period: 1,
                    periodUnit: "d",
                    timeOfDay: ["08:00"],
                    boundsPeriod: {
                      start: "2025-04-14",
                      end: "2025-10-14",
                    },
                  },
                },
                doseAndRate: [{ doseQuantity: { value: 10, unit: "mg" } }],
              },
            ],
            reasonCode: [{ text: "Allergies" }],
          },
          request: { method: "PUT", url: "MedicationRequest/med2" },
        },

        // advil
        {
          resource: {
            resourceType: "MedicationRequest",
            id: "med3",
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
              text: "Advil", // generic name
              coding: [
                {
                  system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                  code: "123456", // placeholder code
                  display: "Advil 400 mg Tablet", // name here must match rxnorm code
                },
              ],
            },
            subject: { reference: `Patient/${this.patientId}` },
            authoredOn: "2024-06-23",
            dosageInstruction: [
              {
                text: "Take 1 tablet (400 mg) as needed for migraines",
                additionalInstruction: [
                  {
                    text: "May cause drowsiness.",
                  },
                ],
                asNeededBoolean: true,
                timing: {
                  repeat: {
                    boundsPeriod: {
                      start: "2024-06-23",
                    },
                  },
                },
                doseAndRate: [{ doseQuantity: { value: 400, unit: "mg" } }],
              },
            ],
            reasonCode: [{ text: "Migraines" }],
          },
          request: { method: "PUT", url: "MedicationRequest/med3" },
        },
      ],
    };
    // upload FHIR bundle to public HAPI FHIR server
    fetch(this.fhirBase, {
      method: "POST",
      headers: { "Content-Type": "application/fhir+json" },
      body: JSON.stringify(bundle),
    })
      .then((uploadResult) => {
        if (uploadResult.ok) {
          console.log("patient bundle reset successful!");
        } else {
          console.error("upload failed!", uploadResult.statusText);
        }
      })
      .catch((err) => {
        console.error("Error uploading FHIR bundle:", err);
      });
  }
}
