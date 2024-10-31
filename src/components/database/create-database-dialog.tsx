"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { DATABASE_CONFIGS } from "@/lib/config/database.config";
import { cn } from "@/lib/utils";
import { DatabasePreview } from "./database-preview";
import { CustomEnvVars } from "./custom-env-vars";

interface CreateDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EnvVarField {
  key: string;
  value: string;
  required: boolean;
  type?: "text" | "password";
  custom?: boolean;
}

type ValidationErrors = {
  name?: string;
  type?: string;
  envVars?: Record<string, string | undefined>;
};

export function CreateDatabaseDialog({
  open,
  onOpenChange,
}: CreateDatabaseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"basic" | "config" | "preview">("basic");
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("");
  const [envVars, setEnvVars] = useState<EnvVarField[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [customEnvKeyError, setCustomEnvKeyError] = useState<string>();

  const resetForm = () => {
    setName("");
    setType("");
    setEnvVars([]);
    setErrors({});
    setStep("basic");
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  // Determine password fields based on database type
  const getEnvVarType = (key: string): "text" | "password" => {
    return key.toLowerCase().includes("password") ? "password" : "text";
  };

  // When database type changes, update environment variables
  const handleTypeChange = (newType: string) => {
    setType(newType);
    const config = DATABASE_CONFIGS[newType as keyof typeof DATABASE_CONFIGS];
    if (!config) return;

    const newEnvVars: EnvVarField[] = [
      ...config.required_env_vars.map((key) => ({
        key,
        value: "",
        required: true,
        type: getEnvVarType(key),
      })),
      ...config.optional_env_vars.map((key) => ({
        key,
        value: "",
        required: false,
        type: getEnvVarType(key),
      })),
    ];
    setEnvVars(newEnvVars);
  };

  const validateBasicInfo = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }

    if (!type) {
      newErrors.type = "Database type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEnvVars = (): boolean => {
    const newErrors: ValidationErrors = {
      envVars: {},
    };

    envVars.forEach((envVar) => {
      if (envVar.required && !envVar.value.trim()) {
        newErrors.envVars![envVar.key] = "This field is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors.envVars || {}).length === 0;
  };

  const handleNext = () => {
    if (validateBasicInfo()) {
      setStep("config");
    }
  };

  const handleBack = () => {
    setStep("basic");
    setErrors({});
  };

  const { mutate: createDatabase, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      const envVarsObject = envVars.reduce((acc, curr) => {
        if (curr.value) {
          acc[curr.key] = curr.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const response = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          envVars: envVarsObject,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create database");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["databases"] });
      toast({
        title: "Success",
        description: "Database created successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create database",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEnvVars()) {
      return;
    }

    createDatabase();
  };

  const handleAddEnvVar = (key: string) => {
    if (envVars.some(v => v.key === key)) {
      setCustomEnvKeyError("Variable name already exists");
      return;
    }
    
    setEnvVars([
      ...envVars,
      {
        key,
        value: "",
        required: false,
        type: getEnvVarType(key),
        custom: true
      }
    ]);
    setCustomEnvKeyError(undefined);
  };

  const handleRemoveEnvVar = (key: string) => {
    setEnvVars(envVars.filter(v => v.key !== key));
  };

  const handleUpdateEnvVar = (key: string, value: string) => {
    setEnvVars(envVars.map(v => 
      v.key === key ? { ...v, value } : v
    ));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Database</DialogTitle>
            <DialogDescription>
              {step === "basic"
                ? "Set up your database name and type"
                : "Configure your database environment variables"}
            </DialogDescription>
          </DialogHeader>
          {step === "basic" ? (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Name
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors({ ...errors, name: undefined });
                  }}
                  placeholder="my-database"
                  className={cn(errors.name && "border-red-500")}
                />
                {errors.name && (
                  <span className="text-sm text-red-500">{errors.name}</span>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">
                  Type
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select
                  value={type}
                  onValueChange={(value) => {
                    handleTypeChange(value);
                    setErrors({ ...errors, type: undefined });
                  }}
                >
                  <SelectTrigger
                    className={cn(errors.type && "border-red-500")}
                  >
                    <SelectValue placeholder="Select database type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(DATABASE_CONFIGS).map((dbType) => (
                      <SelectItem key={dbType} value={dbType}>
                        {dbType.charAt(0).toUpperCase() + dbType.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <span className="text-sm text-red-500">{errors.type}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  These credentials will be used to initialize your database.
                  Make sure to save them securely.
                </AlertDescription>
              </Alert>

              {/* Required and Optional Env Vars */}
              {envVars.filter(v => !v.custom).map((envVar, index) => (
                <div key={envVar.key} className="grid gap-2">
                  <Label htmlFor={`env-${index}`}>
                    {envVar.key}
                    {envVar.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  <Input
                    id={`env-${index}`}
                    type={envVar.type}
                    value={envVar.value}
                    onChange={(e) => {
                      const newEnvVars = [...envVars];
                      newEnvVars[index].value = e.target.value;
                      setEnvVars(newEnvVars);
                      setErrors({
                        ...errors,
                        envVars: {
                          ...errors.envVars,
                          [envVar.key]: undefined,
                        },
                      });
                    }}
                    placeholder={`Enter ${envVar.key}`}
                    className={cn(
                      errors.envVars?.[envVar.key] && "border-red-500"
                    )}
                  />
                  {errors.envVars?.[envVar.key] && (
                    <span className="text-sm text-red-500">
                      {errors.envVars[envVar.key]}
                    </span>
                  )}
                </div>
              ))}

              {/* Custom Env Vars Section */}
              <div className="pt-4">
                <CustomEnvVars
                  envVars={envVars}
                  onAddEnvVar={handleAddEnvVar}
                  onRemoveEnvVar={handleRemoveEnvVar}
                  onUpdateEnvVar={handleUpdateEnvVar}
                  error={customEnvKeyError}
                />
              </div>
            </div>
          )}{" "}
          :
          {step === "preview" && (
            <DatabasePreview
              name={name}
              type={type}
              envVars={envVars}
              showSecrets={showSecrets}
              onToggleSecrets={setShowSecrets}
            />
          )}
          <DialogFooter>
            {step === "basic" ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : step === "config" ? (
              <div className="flex space-x-2 w-full sm:w-auto sm:justify-end">
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button type="button" onClick={() => validateEnvVars() && setStep("preview")}>
                  Next
                </Button>
              </div>
            ) : (
              <div className="flex space-x-2 w-full sm:w-auto sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setStep("config")}>
                  Back
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Database
                </Button>
              </div>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
