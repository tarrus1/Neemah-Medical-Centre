import { DepartmentQueue } from "../_components/department-queue";

export default function TriagePage() {
  return (
    <DepartmentQueue
      title="Triage"
      currentStatus="TRIAGE"
      notesField="triageNotes"
      showPrice={true}
      canSendAnywhere={true}
    />
  );
}



