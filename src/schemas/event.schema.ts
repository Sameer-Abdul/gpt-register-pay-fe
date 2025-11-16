import * as yup from 'yup';
import { PerformanceType } from '@/types/event';

export const participantSchema = yup.object().shape({
  name: yup.string().required('Participant name is required'),
  age: yup.number()
    .required('Age is required')
    .min(1, 'Age must be at least 1')
    .max(120, 'Age must be less than 120'),
  phone: yup.string()
    .required('Phone number is required')
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits'),
  email: yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  address: yup.string().required('Address is required'),
  gender: yup.string()
    .oneOf(['male', 'female', 'other'], 'Please select a valid gender')
    .required('Gender is required'),
  latitude: yup.number()
    .typeError('Latitude must be a number')
    .required('Latitude is required'),
  longitude: yup.number()
    .typeError('Longitude must be a number')
    .required('Longitude is required'),
  comments: yup.string(),
  mandatoryPrerequisite: yup.boolean().default(false)
});

export const eventFormSchema = yup.object().shape({
  name: yup.string().required('Event name is required'),
  description: yup.string(),
  start: yup.date()
    .required('Start date is required')
    .typeError('Invalid date format'),
  end: yup.date()
    .required('End date is required')
    .min(yup.ref('start'), 'End date must be after start date')
    .typeError('Invalid date format'),
  organizationPOC: yup.string().required('Organization POC is required'),
  pocMobile: yup.string()
    .required('POC mobile is required')
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits'),
  pocEmail: yup.string()
    .email('Invalid email address')
    .required('POC email is required'),
  alternateNumber: yup.string()
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits')
    .notRequired(),
  venue: yup.string().required('Venue is required'),
  organizationName: yup.string().required('Organization name is required'),
  latitude: yup.number()
    .typeError('Must be a valid number')
    .notRequired(),
  longitude: yup.number()
    .typeError('Must be a valid number')
    .notRequired(),
  eventCoordinator: yup.string(),
  comments: yup.string(),
  performanceType: yup.string()
    .oneOf<PerformanceType>(['single', 'group'], 'Please select a performance type')
    .required('Performance type is required'),
  participants: yup.array()
    .of(participantSchema)
    .when('performanceType', {
      is: (performanceType: PerformanceType) => performanceType === 'single',
      then: (schema) => schema.min(1, 'At least one participant is required')
    })
});

export const eventFilterSchema = yup.object().shape({
  search: yup.string(),
  fromDate: yup.date(),
  toDate: yup.date()
    .when('fromDate', (fromDate, schema) => {
      return fromDate 
        ? schema.min(fromDate, 'To date must be after from date')
        : schema;
    }),
  performanceType: yup.string()
    .oneOf<PerformanceType | 'all'>(['single', 'group', 'all'], 'Invalid performance type')
    .default('all')
});
