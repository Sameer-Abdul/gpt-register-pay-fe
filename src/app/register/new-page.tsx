'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { registerSchema } from '@/schemas/auth.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  validTo: string;
}

interface RegisterFormData {
  // Personal Information
  firstName: string;
  middleName: string;
  lastName: string;
  mobileNo: string;
  email: string;
  maritalStatus: string;
  marriageDate: string;
  address: string;
  gender: string;
  
  // Location Information
  state: string;
  district: string;
  mandal: string;
  
  // Professional Information
  course: string;
  designation: string;
  highestClassITeach: string;
  
  // School Correspondent Information
  schoolCorrespondentName: string;
  schoolCorrespondentPhone: string;
  schoolCorrespondentEmail: string;
  
  // Required by RegisterData
  name: string; // Full name (combination of firstName, middleName, lastName)
  mobile: string; // Alias for mobileNo
  password: string;
  
  // Optional fields
  utrNumber?: string;
  paymentScreenshot?: File | null;
  screenshot_mime_type?: string;
  payment_id?: string;
  tenantId?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { 
    register: registerUser, 
    isAuthenticated, 
    loading 
  } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  // Navigation functions
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // Skip tenant selection and go directly to registration form
  useEffect(() => {
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  }, [currentStep]);

  const handleSubmit = async (values: RegisterFormData) => {
    try {
      setIsSubmitting(true);
      
      // Prepare the data for registration
      const registrationData = {
        ...values,
        name: `${values.firstName} ${values.middleName ? values.middleName + ' ' : ''}${values.lastName}`.trim(),
        mobile: values.mobileNo,
        password: 'defaultPassword123!', // In a real app, this should be set by the user
        // Add other required fields
        maritalStatus: values.maritalStatus || 'Single',
        course: values.course || 'Award Nomination',
        // Set default tenantId if needed
        tenantId: values.tenantId || 'default-tenant-id'
      };
      
      // Call the register function from AuthContext
      await registerUser(registrationData);
      
      // Redirect to success page after successful registration
      router.push('/payment/success');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formik = useFormik<RegisterFormData>({
    initialValues: {
      // Personal Information
      firstName: '',
      middleName: '',
      lastName: '',
      mobileNo: '',
      mobile: '', // Added missing mobile field
      email: '',
      maritalStatus: 'Single',
      marriageDate: '',
      address: '',
      gender: 'Male',
      
      // Location Information
      state: '',
      district: '',
      mandal: '',
      
      // Professional Information
      course: 'Award Nomination',
      designation: '',
      highestClassITeach: '',
      
      // School Correspondent Information
      schoolCorrespondentName: '',
      schoolCorrespondentPhone: '',
      schoolCorrespondentEmail: '',
      
      // Payment Information
      utrNumber: '',
      paymentScreenshot: null,
      
      // System Fields
      password: 'defaultPassword123!',
      name: '', 
      
      // Additional fields
      screenshot_mime_type: '',
      payment_id: '',
      tenantId: 'default-tenant-id'
    },
    validationSchema: registerSchema,
    onSubmit: handleSubmit,
  });

  // Skip tenant selection and go directly to registration form
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading registration form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-2xl font-bold text-gray-900">Registration Form</h1>
          </div>
          <form id="registration-form" onSubmit={formik.handleSubmit} className="px-4 py-5 sm:p-6 space-y-6">
            <div className="mb-8">
              <div className="relative mb-4">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-gray-200"></div>
                <div 
                  className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-primary transition-all duration-300"
                  style={{
                    width: `${((currentStep - 1) / 3) * 100}%`,
                    maxWidth: '100%',
                  }}
                ></div>
              </div>
              <div className="flex justify-between">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex flex-col items-center">
                    <div 
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        currentStep >= step 
                          ? 'bg-primary text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step}
                    </div>
                    <span className="mt-2 text-xs text-gray-600">
                      {["Personal", "Professional", "School", "Payment"][step - 1]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.firstName}
                    className={formik.touched.firstName && formik.errors.firstName ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    name="middleName"
                    type="text"
                    placeholder="Enter your middle name"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.middleName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.lastName}
                    className={formik.touched.lastName && formik.errors.lastName ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobileNo">Mobile Number *</Label>
                  <Input
                    id="mobileNo"
                    name="mobileNo"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.mobileNo}
                    className={formik.touched.mobileNo && formik.errors.mobileNo ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.email}
                    className={formik.touched.email && formik.errors.email ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Marital Status *</Label>
                  <Select
                    value={formik.values.maritalStatus}
                    onValueChange={(value) => formik.setFieldValue('maritalStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formik.values.maritalStatus === 'Married' && (
                  <div className="space-y-2">
                    <Label htmlFor="marriageDate">Marriage Date</Label>
                    <Input
                      id="marriageDate"
                      name="marriageDate"
                      type="date"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.marriageDate}
                    />
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter your full address"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.address}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Location & Professional Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Location & Professional Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course *</Label>
                  <Select
                    name="course"
                    onValueChange={(value) => formik.setFieldValue('course', value)}
                    value={formik.values.course}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Award Nomination">Award Nomination</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    name="state"
                    onValueChange={(value) => formik.setFieldValue('state', value)}
                    value={formik.values.state}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
                      <SelectItem value="Telangana">Telangana</SelectItem>
                      <SelectItem value="Karnataka">Karnataka</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">District *</Label>
                  <Input
                    id="district"
                    name="district"
                    type="text"
                    placeholder="Enter your district"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.district}
                    className={formik.touched.district && formik.errors.district ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mandal">Mandal *</Label>
                  <Input
                    id="mandal"
                    name="mandal"
                    type="text"
                    placeholder="Enter your mandal"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.mandal}
                    className={formik.touched.mandal && formik.errors.mandal ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designation">Designation *</Label>
                  <Input
                    id="designation"
                    name="designation"
                    type="text"
                    placeholder="Enter your designation"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.designation}
                    className={formik.touched.designation && formik.errors.designation ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="highestClassITeach">Highest Class I Teach *</Label>
                  <Input
                    id="highestClassITeach"
                    name="highestClassITeach"
                    type="text"
                    placeholder="e.g., 10th, 12th, etc."
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.highestClassITeach}
                    className={formik.touched.highestClassITeach && formik.errors.highestClassITeach ? 'border-red-300' : ''}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: School Correspondent Information */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">School Correspondent Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolCorrespondentName">Correspondent Name *</Label>
                  <Input
                    id="schoolCorrespondentName"
                    name="schoolCorrespondentName"
                    type="text"
                    placeholder="Enter correspondent name"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.schoolCorrespondentName}
                    className={formik.touched.schoolCorrespondentName && formik.errors.schoolCorrespondentName ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolCorrespondentPhone">Correspondent Phone *</Label>
                  <Input
                    id="schoolCorrespondentPhone"
                    name="schoolCorrespondentPhone"
                    type="tel"
                    placeholder="Enter correspondent phone number"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.schoolCorrespondentPhone}
                    className={formik.touched.schoolCorrespondentPhone && formik.errors.schoolCorrespondentPhone ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="schoolCorrespondentEmail">Correspondent Email *</Label>
                  <Input
                    id="schoolCorrespondentEmail"
                    name="schoolCorrespondentEmail"
                    type="email"
                    placeholder="Enter correspondent email"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.schoolCorrespondentEmail}
                    className={formik.touched.schoolCorrespondentEmail && formik.errors.schoolCorrespondentEmail ? 'border-red-300' : ''}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Payment Information */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="utrNumber">UTR Number *</Label>
                  <Input
                    id="utrNumber"
                    name="utrNumber"
                    type="text"
                    placeholder="Enter UTR number from your payment"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.utrNumber}
                    className={formik.touched.utrNumber && formik.errors.utrNumber ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentScreenshot">Payment Screenshot *</Label>
                  <Input
                    id="paymentScreenshot"
                    name="paymentScreenshot"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        formik.setFieldValue('paymentScreenshot', e.target.files[0]);
                      }
                    }}
                    onBlur={formik.handleBlur}
                    className="cursor-pointer"
                  />
                  {formik.values.paymentScreenshot && (
                    <p className="text-sm text-muted-foreground">
                      Selected file: {(formik.values.paymentScreenshot as File).name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                >
                  Previous
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-white hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </div>
            </div>
          )}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={formik.isSubmitting || isSubmitting}
              >
                Previous
              </Button>
            ) : (
              <div></div>
            )}
            
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={formik.isSubmitting || isSubmitting}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={formik.isSubmitting || isSubmitting}
              >
                {formik.isSubmitting || isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
