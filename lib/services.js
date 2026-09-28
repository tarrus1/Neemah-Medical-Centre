

export const VITAL_SERVICES = [
  { key: "BP",     label: "Blood pressure",        fields: ["bpSystolic", "bpDiastolic"] },
  { key: "PULSE",  label: "Heart rate (pulse)",    fields: ["heartRate"] },
  { key: "RR",     label: "Respiratory rate",      fields: ["respiratoryRate"] },
  { key: "TEMP",   label: "Temperature",           fields: ["temperature"] },
  { key: "SPO2",   label: "SpO₂",                  fields: ["spo2"] },
  { key: "WEIGHT", label: "Weight",                fields: [] },
];

export const LAB_SERVICES = [
  "Fhg",
  "Pregnancy test",
  "Bs for malaria",
  "H.pylori",
  "HIV",
  "Syphilis",
  "Urinalysis",
  "Blood sugar",
  "Typhoid",
].map((name) => ({ key: name, label: name }));

export const ROLE_ACTIONS = {
  TRIAGE:     "Vital signs",
  DOCTOR:     "Consultation & treatment",
  LABORATORY: "Lab tests",
  PHARMACY:   "Dispense medicine",
  REGISTERED: "Reception",
};

// Which services a given department can *receive* referrals for
export const SERVICES_BY_DEPARTMENT = {
  TRIAGE: VITAL_SERVICES,
  LABORATORY: LAB_SERVICES,
  DOCTOR: [],      // doctor doesn't receive referrals — they act freely
  PHARMACY: [],    // pharmacy receives medicine list via medicinesJson
  REGISTERED: [],
};