import { useState, useEffect, Fragment } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import useAuthStore from "../store/authStore";

function ShareButtons({ url, title }) {
  const shareUrl = url || window.location.href;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(title + " " + shareUrl)}`;
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => alert("Link copied!")).catch(() => prompt("Copy this link:", shareUrl));
  };
  return (
    <div className="flex gap-1.5">
      <button onClick={copyLink} title="Copy link" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 transition-colors cursor-pointer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg> Copy
      </button>
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" title="Share on WhatsApp" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors no-underline">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg> WhatsApp
      </a>
    </div>
  );
}

function BookingSuccessModal({ schedule, selectedSeats, formData, totalFare, startStop, endStop, onViewBookings }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  return (
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-5 transition-all duration-500 ${
      visible ? "bg-black/70 backdrop-blur-sm" : "bg-transparent backdrop-blur-none"
    }`}>
      <div className={`bg-[#0F172A]/90 backdrop-blur-2xl border border-slate-800 rounded-[2rem] w-full max-w-lg text-center transition-all duration-500 ${
        visible ? "scale-100 translate-y-0 opacity-100" : "scale-75 translate-y-8 opacity-0"
      }`} style={{ boxShadow: "0 32px 64px rgba(0,0,0,0.5)" }}>
        <div className="px-10 py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/15 border-[3px] border-emerald-500 flex items-center justify-center">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-emerald-400 text-3xl font-bold mb-2">Booking Confirmed!</h2>
          <p className="text-slate-400 text-base mb-8">Thank you, <span className="text-slate-100 font-semibold">{formData.fullName.split(" ")[0]}</span>! Your seats are reserved.</p>

          <div className="bg-black/30 rounded-2xl p-6 mb-8 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-slate-500 tracking-wider mb-1 uppercase">Route</p>
                <p className="text-[15px] font-bold text-slate-100">{schedule.route?.name}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 tracking-wider mb-1 uppercase">Journey</p>
                <p className="text-[15px] font-bold text-slate-100">{startStop || schedule.route?.stops?.[0] || "–"} → {endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1] || "–"}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 tracking-wider mb-1 uppercase">Departure</p>
                <p className="text-[15px] font-bold text-slate-100">{schedule.departureDate?.split("T")[0]} {schedule.departureTime}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 tracking-wider mb-1 uppercase">Seats</p>
                <p className="text-[15px] font-bold text-emerald-400">{selectedSeats.join(", ")}</p>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-dashed border-slate-700/30 flex justify-between items-center">
              <span className="text-base text-slate-400">Total Paid</span>
              <span className="text-2xl font-bold text-slate-100">Rs. {totalFare}</span>
            </div>
          </div>

          <button onClick={onViewBookings}
            className="w-full py-4 px-4 rounded-2xl font-bold text-[15px] text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-[1.01] transition-all cursor-pointer border-none">
            View My Bookings
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookSeatsPage() {
  const { scheduleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const startStop = searchParams.get("startStop");
  const endStop = searchParams.get("endStop");
  const [schedule, setSchedule] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "", specialRequests: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schedRes, seatsRes] = await Promise.all([
          axios.get(`/api/schedules/${scheduleId}?origin=${startStop || ""}&destination=${endStop || ""}`),
          axios.get(`/api/schedules/${scheduleId}/seats`),
        ]);
        setSchedule(schedRes.data);
        setSeats(seatsRes.data);
      } catch (err) {
        console.error(err);
        alert("Failed to load schedule details");
        navigate("/");
      } finally { setLoading(false); }
    };
    fetchData();
  }, [scheduleId, startStop, endStop, navigate]);

  const toggleSeat = (seatNumber) => {
    if (selectedSeats.includes(seatNumber)) setSelectedSeats(selectedSeats.filter((s) => s !== seatNumber));
    else setSelectedSeats([...selectedSeats, seatNumber]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) return alert("Select at least one seat");
    setStep(2);
  };

  const handleCancel = () => {
    setSelectedSeats([]);
  };

  const handleBook = async () => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) return alert("Please fill in all passenger details");
    if (!user) return alert("Please login to book seats");
    setBooking(true);
    try {
      await axios.post("/api/bookings", {
        scheduleId, seatsToBook: selectedSeats, passengerDetails: formData,
        startStop: startStop || schedule.route?.stops?.[0],
        endStop: endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1],
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      setBooking(false);
      setShowSuccess(true);
    } catch (error) {
      setBooking(false);
      alert(error.response?.data?.message || "Booking failed");
    }
  };

  if (loading) return <div className="py-12 px-4 text-center text-slate-400 text-sm">Loading schedule...</div>;
  if (!schedule) return <div className="py-12 px-4 text-center text-slate-400 text-sm">Schedule not found</div>;

  const seatList = schedule.seats && schedule.seats.length > 0 ? schedule.seats : seats;
  const totalFare = schedule.fare * selectedSeats.length;
  const wizardStep = step === 2 ? 2 : showSuccess ? 3 : 1;
  const wizardSteps = [
    { num: 1, label: "Select Seats", short: "Seats" },
    { num: 2, label: "Passenger Info", short: "Info" },
    { num: 3, label: "Confirmation", short: "Done" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 pb-24">

      <div className="w-full max-w-2xl mx-auto px-4 mt-5 flex flex-col items-center justify-center">

        <div className="w-full max-w-xl flex items-center justify-between mb-4">
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
          ) : (
            <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
          )}
          <ShareButtons title={`SmartBus - ${schedule?.bus?.busNumber || ""} ${schedule?.route?.name || ""}`} />
        </div>

        <div className="flex items-center w-full max-w-xl mb-6">
          {wizardSteps.map((s, i) => (
            <Fragment key={s.num}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-all duration-300 ${
                  wizardStep >= s.num
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30"
                    : "bg-slate-800 text-slate-500"
                }`}>
                  {wizardStep > s.num ? (
                    <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : s.num}
                </div>
                <span className={`text-[10px] md:text-xs mt-1.5 font-medium tracking-wide ${
                  wizardStep >= s.num ? "text-emerald-400" : "text-slate-600"
                }`}>
                  <span className="hidden md:inline">{s.label}</span>
                  <span className="md:hidden">{s.short}</span>
                </span>
              </div>
              {i < wizardSteps.length - 1 && (
                <div className={`flex-1 h-[2px] mx-2 md:mx-4 rounded-full transition-all duration-300 ${
                  wizardStep > s.num ? "bg-emerald-500/60" : "bg-slate-800"
                }`} />
              )}
            </Fragment>
          ))}
        </div>

        {step === 1 && !showSuccess && (
          <>

            <div className="w-full max-w-xl bg-slate-900/80 p-5 md:p-6 rounded-2xl border border-slate-800 mb-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
                <div>
                  <p className="text-[10px] md:text-[11px] text-slate-500 tracking-wider mb-1 uppercase">Route</p>
                  <p className="text-sm md:text-[15px] font-bold text-slate-100 truncate">{schedule.route?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] md:text-[11px] text-slate-500 tracking-wider mb-1 uppercase">Journey</p>
                  <p className="text-sm md:text-[15px] font-bold text-slate-100 truncate">
                    {startStop || schedule.route?.stops?.[0] || "—"} → {endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1] || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] md:text-[11px] text-slate-500 tracking-wider mb-1 uppercase">Departure</p>
                  <p className="text-sm md:text-[15px] font-bold text-slate-100 truncate">
                    {schedule.departureDate?.split("T")[0] || "—"} <span className="text-slate-400 font-normal">at</span> {schedule.departureTime || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] md:text-[11px] text-slate-500 tracking-wider mb-1 uppercase">Fare</p>
                  <p className="text-sm md:text-[15px] font-bold text-emerald-400">Rs. {schedule.fare}<span className="text-slate-500 font-normal">/seat</span></p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 p-5 md:p-7 rounded-[2.5rem] border border-slate-800 shadow-2xl w-full max-w-xl">

              <div className="flex justify-center mb-5">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-5 py-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v7M12 15v7M22 12h-7M9 12H2" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500 tracking-widest uppercase leading-tight">Driver</p>
                    <p className="text-sm font-bold text-slate-200 leading-tight">{schedule.bus?.busNumber || "Bus"}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-x-4 gap-y-3 justify-center items-center">
                {seatList.map((seat, index) => {
                  const isBooked = seat.isBooked || seat.status === "Booked";
                  const isBroken = seat.isBroken || seat.status === "Broken";
                  const isSelected = selectedSeats.includes(seat.seatNumber);
                  const seatDisabled = isBooked || isBroken;
                  return (
                    <Fragment key={seat._id || seat.id}>
                      {index % 4 === 2 && (
                        <div className="pointer-events-none select-none text-center opacity-20 text-slate-400 text-sm font-bold">|</div>
                      )}
                      <button
                        disabled={seatDisabled}
                        onClick={() => toggleSeat(seat.seatNumber)}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 select-none flex items-center justify-center
                          ${isSelected
                            ? "bg-emerald-500 text-slate-950 font-extrabold shadow-md shadow-emerald-500/20"
                            : isBooked
                              ? "bg-slate-800 text-slate-500 border border-slate-800/80 cursor-not-allowed line-through"
                              : isBroken
                                ? "bg-amber-600/20 text-amber-400 border border-amber-600/40 cursor-not-allowed"
                                : "bg-slate-800/40 text-slate-300 border border-slate-700/60 cursor-pointer"
                          }
                        `}
                      >
                        {seat.seatNumber}
                      </button>
                    </Fragment>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-5 md:gap-6 mt-5 pt-4 border-t border-slate-700/30">
                <div className="inline-flex items-center gap-1.5 md:gap-2">
                  <span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-slate-800 border border-slate-600/50 rounded-sm" />
                  <span className="text-[11px] md:text-sm text-slate-500">Available</span>
                </div>
                <div className="inline-flex items-center gap-1.5 md:gap-2">
                  <span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-500 rounded-sm" />
                  <span className="text-[11px] md:text-sm text-slate-500">Selected</span>
                </div>
                <div className="inline-flex items-center gap-1.5 md:gap-2">
                  <span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500/40 rounded-sm" />
                  <span className="text-[11px] md:text-sm text-slate-500">Booked</span>
                </div>
                <div className="inline-flex items-center gap-1.5 md:gap-2">
                  <span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-amber-500/40 rounded-sm" />
                  <span className="text-[11px] md:text-sm text-slate-500">Broken</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 rounded-2xl p-5 md:p-6 border border-slate-800 text-center w-full max-w-xl mt-6">
              <p className="text-sm md:text-base text-slate-200 font-medium mb-1">
                <span className="text-emerald-400 font-bold">{selectedSeats.length}</span> seat{selectedSeats.length !== 1 ? "s" : ""} selected
              </p>
              {selectedSeats.length > 0 ? (
                <p className="text-xs md:text-sm text-slate-500 mb-2 font-mono">Seats: {[...selectedSeats].sort((a, b) => {
                  const numA = parseInt(String(a).replace(/\D/g, ""), 10);
                  const numB = parseInt(String(b).replace(/\D/g, ""), 10);
                  return numA - numB;
                }).join(", ")}</p>
              ) : (
                <p className="text-xs md:text-sm text-slate-600 mb-2">No seats selected yet</p>
              )}
              <p className="font-mono text-lg md:text-xl font-bold text-emerald-400 mb-5">Total: Rs. {totalFare}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleCancel}
                  disabled={selectedSeats.length === 0}
                  className="px-5 md:px-6 py-2.5 md:py-3 rounded-xl bg-slate-800 text-slate-400 text-sm font-medium hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleContinue}
                  disabled={selectedSeats.length === 0}
                  className="px-6 md:px-8 py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-bold text-sm md:text-[15px] hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none cursor-pointer border-none"
                >
                  Continue to Details ➔
                </button>
              </div>
            </div>

          </>
        )}

        {step === 2 && (
          <>

            <div className="w-full max-w-xl bg-[#0F172A]/90 p-6 md:p-7 rounded-[2rem] border border-slate-800 shadow-xl mx-auto mb-6">
              <div className="flex items-center justify-between mb-5 md:mb-6">
                <h3 className="text-sm md:text-base font-bold text-slate-100">Passenger Details</h3>
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[11px] md:text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-500/20">
                  <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                  Rs. {totalFare} · {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""}
                </span>
              </div>

              {!user && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-center">
                  <p className="text-red-400 text-sm">Please <a href="/login" className="text-emerald-400 underline hover:text-emerald-300">login</a> to complete your booking.</p>
                </div>
              )}

              <div className="space-y-4">
                {[
                  { name: "fullName", label: "Full Name", type: "text", placeholder: "Enter your full name" },
                  { name: "email", label: "Email", type: "email", placeholder: "Enter your email" },
                  { name: "phone", label: "Phone Number", type: "tel", placeholder: "Enter your phone number" },
                  { name: "specialRequests", label: "Special Requests", type: "text", placeholder: "Any special requests?" },
                ].map(field => (
                  <div key={field.name}>
                    <label className="block mb-1.5 text-[11px] md:text-xs text-slate-400 font-medium">{field.label}{field.name !== "specialRequests" ? " *" : ""}</label>
                    <input
                      type={field.type} name={field.name} value={formData[field.name]}
                      onChange={handleInputChange} placeholder={field.placeholder}
                      required={field.name !== "specialRequests"}
                      className="w-full py-3 md:py-3.5 px-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-100 text-sm md:text-[15px] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 md:mt-6 space-y-3">
                <button
                  onClick={handleBook}
                  disabled={booking || !user}
                  className={`w-full py-3.5 md:py-4 px-4 rounded-2xl font-bold text-sm md:text-[15px] transition-all duration-200 cursor-pointer border-none ${
                    booking || !user
                      ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 hover:scale-[1.01] hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98]"
                  }`}
                >
                  {booking ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : "Confirm Booking"}
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="w-full py-3 md:py-3.5 rounded-xl font-medium text-sm text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-colors cursor-pointer"
                >
                  Back to Seats
                </button>
              </div>
            </div>

          </>
        )}

      </div>

      {showSuccess && (
        <BookingSuccessModal
          schedule={schedule} selectedSeats={selectedSeats} formData={formData}
          totalFare={totalFare}
          startStop={startStop || schedule.route?.stops?.[0]}
          endStop={endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1]}
          onViewBookings={() => navigate("/passenger")}
        />
      )}

    </div>
  );
}
