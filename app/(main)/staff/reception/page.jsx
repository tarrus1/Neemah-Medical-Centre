import { DepartmentQueue } from "../_components/department-queue";

export default function ReceptionPage() {
    return (
        <DepartmentQueue
            title="Reception"
            currentStatus="REGISTERED"
            notesField="triageNotes"
            canRegister={true}
            canDelete={true}
            canSendAnywhere={true}
        />
    );
}