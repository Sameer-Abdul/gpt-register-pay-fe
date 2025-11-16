import * as Yup from 'yup';

export const registrationSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  mobileNo: Yup.string()
    .matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits')
    .required('Mobile number is required'),
  address: Yup.string().required('Address is required'),
  gender: Yup.string().required('Gender is required'),
  maritalStatus: Yup.string().required('Marital status is required'),
  state: Yup.string().required('State is required'),
  district: Yup.string().required('District is required'),
  mandal: Yup.string().required('Mandal is required'),
  designation: Yup.string().required('Designation is required'),
  subject: Yup.string().required('Subject is required'),
  experience: Yup.string().required('Experience is required'),
  tenantId: Yup.string().required('Tenant ID is required'),
});

export const paymentSchema = Yup.object().shape({
  utrNumber: Yup.string().required('UTR number is required'),
  screenshot: Yup.mixed().required('Payment screenshot is required'),
});
