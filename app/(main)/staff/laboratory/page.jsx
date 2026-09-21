import { DepartmentQueue } from "../_components/department-queue";

export default function LaboratoryPage() {
  return (
    <DepartmentQueue
      title="Laboratory"
      currentStatus="LABORATORY"   // ← must be LABORATORY, not LAB
      notesField="laboratoryNotes"
      showPrice={true}
      canSendAnywhere={true}
    />
  );
}