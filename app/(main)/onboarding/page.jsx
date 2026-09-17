"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Stethoscope, Loader2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { setUserRole } from "@/actions/onboarding";
import { doctorFormSchema } from "@/lib/schema";
import { SPECIALTIES } from "@/lib/specialities";
import useFetch from "@/hooks/use-fetch";
import { useEffect } from "react";

export default function OnboardingPage() {
  const [step, setStep] = useState("choose-role");
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const router = useRouter();

  const { loading, data, fn: submitUserRole } = useFetch(setUserRole);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: {
      specialties: [],
      experience: undefined,
      credentialUrl: "",
      description: "",
    },
  });

  const handlePatientSelection = async () => {
    if (loading) return;

    const formData = new FormData();
    formData.append("role", "PATIENT");

    await submitUserRole(formData);
  };

  useEffect(() => {
    if (data && data?.success) {
      router.push(data.redirect);
    }
  }, [data]);

  // Add a specialty
  const addSpecialty = (specialty) => {
    if (!selectedSpecialties.includes(specialty)) {
      const newSpecialties = [...selectedSpecialties, specialty];
      setSelectedSpecialties(newSpecialties);
      setValue("specialties", newSpecialties);
    }
  };

  // Remove a specialty
  const removeSpecialty = (specialty) => {
    const newSpecialties = selectedSpecialties.filter((s) => s !== specialty);
    setSelectedSpecialties(newSpecialties);
    setValue("specialties", newSpecialties);
  };

  const onDoctorSubmit = async (data) => {
    if (loading) return;

    const formData = new FormData();
    formData.append("role", "DOCTOR");
    
    // Append all specialties
    selectedSpecialties.forEach((specialty) => {
      formData.append("specialties", specialty);
    });
    
    formData.append("experience", data.experience.toString());
    formData.append("credentialUrl", data.credentialUrl);
    formData.append("description", data.description);

    await submitUserRole(formData);
  };

  // Role selection screen
  if (step === "choose-role") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className="border-emerald-900/20 hover:border-emerald-700/40 cursor-pointer transition-all"
          onClick={() => !loading && handlePatientSelection()}
        >
          <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
            <div className="p-4 bg-emerald-900/20 rounded-full mb-4">
              <User className="h-8 w-8 text-emerald-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-white mb-2">
              Join as a Patient
            </CardTitle>
            <CardDescription className="mb-4">
              Book free appointments, consult with doctors, and manage your
              healthcare journey
            </CardDescription>
            <Button
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Continue as Patient"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card
          className="border-emerald-900/20 hover:border-emerald-700/40 cursor-pointer transition-all"
          onClick={() => !loading && setStep("doctor-form")}
        >
          <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
            <div className="p-4 bg-emerald-900/20 rounded-full mb-4">
              <Stethoscope className="h-8 w-8 text-emerald-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-white mb-2">
              Join as a Doctor
            </CardTitle>
            <CardDescription className="mb-4">
              Create your professional profile, set your availability, and
              provide free consultations
            </CardDescription>
            <Button
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              Continue as Doctor
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Doctor registration form
  if (step === "doctor-form") {
    return (
      <Card className="border-emerald-900/20">
        <CardContent className="pt-6">
          <div className="mb-6">
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Complete Your Doctor Profile
            </CardTitle>
            <CardDescription>
              Please provide your professional details for verification
            </CardDescription>
          </div>

          <form onSubmit={handleSubmit(onDoctorSubmit)} className="space-y-6">
            {/* Multiple Specialties Selection */}
            <div className="space-y-2">
              <Label>Medical Specialties</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select all specialties that apply to your practice
              </p>
              
              {/* Selected specialties as badges */}
              {selectedSpecialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedSpecialties.map((specialty) => (
                    <Badge
                      key={specialty}
                      variant="outline"
                      className="bg-emerald-900/20 border-emerald-700/30 text-emerald-400 px-3 py-1"
                    >
                      {specialty}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(specialty)}
                        className="ml-2 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Dropdown to add specialties */}
              <Select
                value=""
                onValueChange={(value) => addSpecialty(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add a specialty..." />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.filter(
                    (spec) => !selectedSpecialties.includes(spec.name)
                  ).map((spec) => (
                    <SelectItem
                      key={spec.name}
                      value={spec.name}
                      className="flex items-center gap-2"
                    >
                      <span className="text-emerald-400">{spec.icon}</span>
                      {spec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {errors.specialties && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  {errors.specialties.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                placeholder="e.g. 5"
                {...register("experience", { valueAsNumber: true })}
              />
              {errors.experience && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  {errors.experience.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="credentialUrl">Link to Credential Document</Label>
              <Input
                id="credentialUrl"
                type="url"
                placeholder="https://example.com/my-medical-degree.pdf"
                {...register("credentialUrl")}
              />
              {errors.credentialUrl && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  {errors.credentialUrl.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Please provide a link to your medical degree or certification
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description of Your Services</Label>
              <Textarea
                id="description"
                placeholder="Describe your expertise, services, and approach to patient care..."
                rows="4"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("choose-role")}
                className="border-emerald-900/30"
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit for Verification"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }
}