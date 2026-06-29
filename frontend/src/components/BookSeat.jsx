import React, { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';

function StepIndicator({ step, totalSteps }) {
  const steps = [
    { num: 1, label: "Select Seats" },
    { num: 2, label: "Passenger Info" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-5">
      {steps.map((s, i) => (
        <Fragment key={s.num}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step > s.num ? "bg-emerald-500 text-white" :
              step === s.num ? "bg-emerald-500 text-white ring-4 ring-emerald-500/30" :
              "bg-slate-700 text-slate-400"
            }`}>
              {step > s.num ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : s.num}
            </div>
            <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
              step >= s.num ? "text-emerald-400" : "text-slate-500"
            }`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-full max-w-16 h-0.5 mx-2 mt-[-1.25rem] rounded-full transition-all duration-300 ${
              step > s.num ? "bg-emerald-500" : "bg-slate-700"
            }`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default function BookSeat() {
    const { scheduleId } = useParams();
    const [schedule, setSchedule] = useState(null);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', specialRequests: '' });
    const { user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`/api/schedules/${scheduleId}`)
            .then(res => setSchedule(res.data))
            .catch(err => { console.error(err); setFetchError(err.response?.data?.message || 'Failed to load schedule'); });
    }, [scheduleId]);

    const toggleSeat = (seatNumber) => {
        if (selectedSeats.includes(seatNumber)) setSelectedSeats(selectedSeats.filter(s => s !== seatNumber));
        else setSelectedSeats([...selectedSeats, seatNumber]);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleContinue = () => {
        if (selectedSeats.length === 0) return alert('Select at least one seat');
        setStep(2);
    };

    const handleBook = async () => {
        if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) return alert('Please fill in all passenger details');
        setLoading(true);
        try {
            await axios.post('/api/bookings', { scheduleId, seatsToBook: selectedSeats, passengerDetails: formData }, { headers: { Authorization: `Bearer ${user.token}` } });
            setLoading(false);
            alert('Booking confirmed successfully!');
            navigate('/passenger');
        } catch (error) {
            setLoading(false);
            alert(error.response?.data?.message || 'Booking failed');
        }
    };

    if (fetchError) return (
        <div className="bg-slate-800/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-8 text-center max-w-lg mx-auto my-4">
            <h4 className="text-red-400 font-bold mb-2 text-lg">Error</h4>
            <p className="text-sm text-slate-400 mb-4">{fetchError}</p>
            <button onClick={() => navigate('/')} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm cursor-pointer border-none shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow">
                Back to Home
            </button>
        </div>
    );
    if (!schedule) return <div className="py-12 px-4 text-center text-slate-400 text-sm">Loading schedule...</div>;

    const totalFare = schedule.fare * selectedSeats.length;

    return (
        <div className="animate-fade-in max-w-4xl mx-auto my-4 px-3 sm:px-4 pb-24 sm:pb-0">
            <StepIndicator step={step} totalSteps={2} />

            <div className="bg-slate-800/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 mb-4">
                <h3 className="text-lg font-bold text-slate-100 mb-4">Seat Booking</h3>

                <div className="grid grid-cols-2 gap-3 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-xl p-3 sm:p-4 mb-4 border border-slate-700/30">
                    <div className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="22" height="18" rx="3" /><path d="M7 19v2M17 19v2M1 9h22M5 13h4M15 13h4" /></svg>
                        <div>
                            <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase font-medium">Bus</p>
                            <p className="text-sm font-bold text-slate-100">{schedule.bus?.busNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 11l2-6h14l2 6M3 11v7a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1h10v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-7M3 11h18M8 11V7M16 11V7M12 11V7" /></svg>
                        <div>
                            <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase font-medium">Route</p>
                            <p className="text-sm font-bold text-slate-100">{schedule.route?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>
                        <div>
                            <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase font-medium">Departure</p>
                            <p className="text-sm font-bold text-slate-100">{schedule.departureDate?.split('T')[0]} <span className="text-slate-400 font-normal">at</span> {schedule.departureTime}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                        <div>
                            <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase font-medium">Fare/Seat</p>
                            <p className="text-sm font-bold text-emerald-400">Rs. {schedule.fare}</p>
                        </div>
                    </div>
                </div>

                {step === 1 ? (
                    <>
                        <div className="bg-slate-900/50 md:bg-gradient-to-br md:from-slate-800/60 md:to-slate-900/60 p-4 md:p-6 rounded-3xl md:rounded-2xl border border-slate-800 md:border-slate-700/50 md:max-w-3xl mx-auto md:shadow-lg">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50 md:border-slate-600/30">
                                <span className="hidden md:flex items-center gap-2 text-[10px] text-slate-600 font-medium tracking-wider">
                                    <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v7M12 15v7M2 12h7M15 12h7"/></svg>
                                    FRONT
                                </span>
                                <div className="flex items-center gap-3 ml-auto">
                                    <div className="hidden md:flex gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                                        <span className="w-2 h-2 rounded-full bg-amber-400/60" />
                                    </div>
                                    <span className="bg-slate-800 md:bg-slate-700/50 text-slate-400 md:text-slate-300 px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
                                        DRIVER
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-5 md:grid-cols-4 gap-2 md:gap-x-6 md:gap-y-4 max-w-sm md:max-w-none mx-auto items-center justify-center">
                                {(schedule.seats || []).map((seat, index) => {
                                    const isBooked = seat.isBooked || seat.status === "Booked";
                                    const isBroken = seat.isBroken || seat.status === "Broken";
                                    const isSelected = selectedSeats.includes(seat.seatNumber);
                                    const seatDisabled = isBooked || isBroken;
                                    return (
                                        <Fragment key={seat._id}>
                                            {index % 4 === 2 && <div className="md:hidden" />}
                                            <button
                                                disabled={seatDisabled}
                                                onClick={() => toggleSeat(seat.seatNumber)}
                                                className={`
                                                    w-full py-2 md:py-4 text-xs md:text-sm font-semibold rounded-xl md:rounded-xl
                                                    transition-all duration-200 select-none flex items-center justify-center
                                                    ${isSelected
                                                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 scale-95 ring-2 ring-emerald-400/50 border-2 border-emerald-500"
                                                        : isBooked
                                                            ? "bg-slate-700/60 md:bg-red-500/20 text-slate-500 md:text-red-300 line-through cursor-not-allowed border border-slate-700 md:border-red-500/30"
                                                            : isBroken
                                                                ? "bg-amber-500/80 md:bg-amber-500/60 text-white border border-amber-500 cursor-not-allowed"
                                                                : "bg-slate-700 hover:bg-emerald-900/50 hover:border-emerald-500 hover:shadow-sm hover:shadow-emerald-900/20 md:bg-slate-700/40 md:hover:bg-emerald-900/30 md:hover:border-emerald-500 text-slate-200 border border-slate-600 md:border-slate-600/60 cursor-pointer"
                                                    }
                                                    ${!seatDisabled && !isSelected ? "hover:scale-105 active:scale-95" : ""}
                                                `}
                                            >
                                                {seat.seatNumber}
                                            </button>
                                        </Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-3 md:gap-6 mt-4 md:mt-5 text-xs text-slate-400 flex-wrap">
                            <div className="inline-flex items-center gap-1.5 bg-slate-800/50 md:bg-slate-700/20 px-2.5 py-1 rounded-full border border-slate-700/50">
                                <span className="w-2.5 h-2.5 bg-slate-700 md:bg-slate-700/40 border border-slate-600 md:border-slate-600/60 rounded-full" />
                                <span>Available</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-700/30">
                                <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full shadow-sm shadow-emerald-500/40" />
                                <span>Selected</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 bg-slate-800/50 md:bg-red-900/20 px-2.5 py-1 rounded-full border border-slate-700/50 md:border-red-700/30">
                                <span className="w-2.5 h-2.5 bg-slate-700/60 md:bg-red-500/20 border border-slate-700 md:border-red-500/30 rounded-full" />
                                <span>Booked</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-700/30">
                                <span className="w-2.5 h-2.5 bg-amber-500/80 md:bg-amber-500/60 rounded-full" />
                                <span>Broken</span>
                            </div>
                        </div>

                        {selectedSeats.length > 0 && (
                            <div className="sm:static sm:mt-5 fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 p-3 sm:p-4 sm:bg-slate-800/80 sm:backdrop-blur-xl sm:border sm:border-slate-700/50 sm:rounded-2xl sm:static sm:z-auto sm:shadow-lg">
                                <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
                                    <div className="text-sm text-slate-300 leading-snug">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-emerald-400 font-bold text-base">{selectedSeats.length}</span>
                                            <span>seat{selectedSeats.length > 1 ? "s" : ""} selected</span>
                                            <span className="hidden sm:inline text-slate-500">—</span>
                                            <span className="hidden sm:inline text-slate-400 font-medium">{selectedSeats.join(", ")}</span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <span className="text-[11px] text-slate-500">Total fare</span>
                                            <span className="text-emerald-400 font-bold text-sm">Rs. {totalFare}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleContinue}
                                        className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm px-6 py-2.5 sm:px-8 sm:py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/40 active:scale-95 whitespace-nowrap cursor-pointer border-none"
                                    >
                                        Proceed to Book
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedSeats.length === 0 && (
                            <div className="flex flex-col gap-3 mt-4">
                                <button onClick={() => navigate('/')} className="w-full py-2.5 rounded-xl font-medium text-sm text-slate-300 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border-none">
                                    Cancel
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-500/30">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                Rs. {totalFare}
                            </span>
                            <span className="text-xs text-slate-400">for {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""}</span>
                        </div>

                        <div className="space-y-4 mb-2">
                            {[
                                { name: 'fullName', label: 'Full Name *', type: 'text', placeholder: 'Enter your full name' },
                                { name: 'email', label: 'Email *', type: 'email', placeholder: 'Enter your email' },
                                { name: 'phone', label: 'Phone Number *', type: 'tel', placeholder: 'Enter your phone number' },
                                { name: 'specialRequests', label: 'Special Requests', type: 'text', placeholder: 'Any special requests?' },
                            ].map(f => (
                                <div key={f.name}>
                                    <label className="block mb-1.5 text-xs text-slate-400 font-medium">{f.label}</label>
                                    <input
                                        type={f.type} name={f.name} value={formData[f.name]}
                                        onChange={handleInputChange} placeholder={f.placeholder}
                                        required={f.name !== 'specialRequests'}
                                        className="w-full py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 mt-6 pb-20 sm:pb-0">
                            <button
                                onClick={handleBook}
                                disabled={loading}
                                className={`w-full py-3 sm:py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base text-white transition-all cursor-pointer border-none ${
                                    loading
                                        ? "bg-emerald-600/50 cursor-not-allowed"
                                        : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] shadow-lg shadow-emerald-900/30"
                                }`}
                            >
                                {loading ? (
                                    <span className="inline-flex items-center gap-2">
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Processing...
                                    </span>
                                ) : "Confirm Booking"}
                            </button>
                            <button onClick={() => setStep(1)} className="w-full py-2.5 rounded-xl font-medium text-sm text-slate-300 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border-none">
                                ← Back to Seats
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
