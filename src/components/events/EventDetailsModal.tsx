import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Event, Participant } from '@/types/event';

interface EventDetailsModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  if (!event) return null;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      {event.name}
                    </Dialog.Title>
                    <div className="mt-2">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900">Event Details</h4>
                          <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <dt className="text-sm text-gray-500">Date & Time</dt>
                              <dd className="mt-1 text-sm text-gray-900">
                                {event.date && event.start_time && event.end_time && (
                                  <>
                                    {format(new Date(`${event.date}T${event.start_time}`), 'PPP')} •{" "}
                                    {format(new Date(`${event.date}T${event.start_time}`), 'h:mm a')} -{" "}
                                    {format(new Date(`${event.date}T${event.end_time}`), 'h:mm a')}
                                  </>
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Venue</dt>
                              <dd className="mt-1 text-sm text-gray-900">{event.venue}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Organization</dt>
                              <dd className="mt-1 text-sm text-gray-900">{event.organization_name || 'N/A'}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Point of Contact</dt>
                              <dd className="mt-1 text-sm text-gray-900">{event.organization_contact || 'N/A'}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Contact Number</dt>
                              <dd className="mt-1 text-sm text-gray-900">{event.organization_contact || 'N/A'}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-gray-500">Email</dt>
                              <dd className="mt-1 text-sm text-gray-900">{event.organization_email || 'N/A'}</dd>
                            </div>
                          </dl>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900">Participants</h4>
                          <div className="mt-2 overflow-hidden border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Prerequisite
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {event.participants?.length ? (
                                  event.participants.map((participant, index) => (
                                    <tr key={index}>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {participant.name}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {participant.phone_no}<br />
                                        {participant.email}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {participant.prerequisites_completed ? 'Yes' : 'No'}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={3} className="px-4 py-3 text-sm text-center text-gray-500">
                                      No participants registered yet
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
