import {
  HeartPulse,
  Stethoscope,
  Baby,
  Brain,
  Users,
  Hospital,
  Milestone,
  Timer,
  Scissors,
  Apple,
  Syringe
} from "lucide-react";

export const SPECIALTIES = [

  {
    name: "General Consultation/Treatment",
    icon: <Stethoscope className="h-5 w-5" />,
  },

  {
    name: "Minor Surgeries",
    icon: <Scissors className="h-5 w-5" />,
  },
  {
    name: "Diabetes/Hypertension Clinic",
    icon: <HeartPulse className="h-5 w-5" />,
  },
  {
    name: "Telemedicine, Follow up and Reviews",
    icon: <Timer className="h-5 w-5" />,
  },
  {
    name: "Immunization",
    icon: <Syringe className="h-5 w-5" />,
  },
  {
    name: "Paediatric Clinic",
    icon: <Hospital className="h-5 w-5" />,
  },
  {
    name: "Counselling Services",
    icon: <Brain className="h-5 w-5" />,
  },
  {
    name: "Nutritional Services",
    icon: <Apple className="h-5 w-5" />,
  },
  {
    name: "Family Planning",
    icon: <Users className="h-5 w-5" />,
  },
  {
    name: "PNC (Postnatal Care)",
    icon: <Baby className="h-5 w-5" />,
  },
  {
    name: "ANC (Antenatal Care)",
    icon: <Milestone className="h-5 w-5" />,
  },
  {
    name: "MCH (Maternal & Child Health)",
    icon: <Baby className="h-5 w-5" />,
  },
  
];
