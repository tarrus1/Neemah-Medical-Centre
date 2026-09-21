import { DepartmentQueue } from "../_components/department-queue";

export default function PharmacyPage() {
  return (
    <DepartmentQueue
      title="Pharmacy"
      currentStatus="PHARMACY"
      nextLabel="Complete & Finish"
      notesField="pharmacyNotes"
      showPrice={true}
      canSendAnywhere={true}
    />
  );
}