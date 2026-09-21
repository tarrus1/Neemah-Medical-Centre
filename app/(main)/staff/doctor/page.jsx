import { DepartmentQueue } from "../_components/department-queue";

export default function DoctorStationPage() {
    return (
        <DepartmentQueue
            title="Doctor Consultation"
            currentStatus="DOCTOR"
            notesField="doctorNotes"
            showPrice={true}
            canSendAnywhere={true}
        />
    );
}