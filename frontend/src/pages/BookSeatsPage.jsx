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
    <div className="flex gap-1.5 flex-wrap">
      <button onClick={copyLink} title="Copy link" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 transition-colors cursor-pointer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg> Copy
      </button>
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" title="Share on WhatsApp" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors no-underline">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg> WhatsApp
      </a>
    </div>
  );
}

function StepIndicator({ step }) {
  const steps = [
    { num: 1, label: "Select Seats" },
    { num: 2, label: "Passenger Info" },
    { num: 3, label: "Confirmation" },
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

function BookingSuccessModal({ schedule, selectedSeats, formData, totalFare, startStop, endStop, onViewBookings }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  return (
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 transition-all duration-500 ${
      visible ? "bg-black/70 backdrop-blur-sm" : "bg-transparent backdrop-blur-none"
    }`}>
      <div className={`bg-slate-800/90 backdrop-blur-2xl border border-white/20 rounded-3xl w-full max-w-md text-center transition-all duration-500 ${
        visible ? "scale-100 translate-y-0 opacity-100" : "scale-75 translate-y-8 opacity-0"
      }`} style={{ boxShadow: "0 32px 64px rgba(0,0,0,0.5)" }}>
        <div className="p-[clamp(1.5rem,5vw,2.5rem)]">
          <div className="w-[clamp(60px,15vw,80px)] h-[clamp(60px,15vw,80px)] mx-auto mb-5 rounded-full bg-emerald-500/15 border-3 border-emerald-500 flex items-center justify-center">
            <svg className="w-[clamp(30px,8vw,40px)] h-[clamp(30px,8vw,40px)]" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-emerald-400 text-[clamp(1.4rem,4vw,1.8rem)] font-bold mb-2">Booking Confirmed!</h2>
          <p className="text-slate-400 text-sm mb-6">Thank you, <span className="text-slate-100 font-semibold">{formData.fullName.split(" ")[0]}</span>! Your seats are reserved.</p>

          <div className="bg-black/30 rounded-2xl p-[clamp(1rem,3vw,1.5rem)] mb-6 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase">Route</p>
                <p className="text-sm font-bold text-slate-100">{schedule.route?.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase">Journey</p>
                <p className="text-sm font-bold text-slate-100">{startStop || schedule.route?.stops?.[0] || "–"} → {endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1] || "–"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase">Departure</p>
                <p className="text-sm font-bold text-slate-100">{schedule.departureDate?.split("T")[0]} {schedule.departureTime}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase">Seats</p>
                <p className="text-sm font-bold text-emerald-400">{selectedSeats.join(", ")}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-dashed border-white/10 flex justify-between items-center">
              <span className="text-sm text-slate-400">Total Paid</span>
              <span className="text-[clamp(1.2rem,4vw,1.5rem)] font-bold text-slate-100">Rs. {totalFare}</span>
            </div>
          </div>

          <button onClick={onViewBookings}
            className="w-full py-3 px-4 rounded-xl font-bold text-base text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer border-none">
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

  return (
    <div className="animate-fade-in max-w-4xl mx-auto my-4 px-3 sm:px-4 pb-24 sm:pb-0">
      <StepIndicator step={step} />

      <div className="bg-slate-800/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h3 className="text-lg font-bold text-slate-100 m-0">Book Your Seats</h3>
          <ShareButtons title={`SmartBus - ${schedule?.bus?.busNumber || ""} ${schedule?.route?.name || ""}`} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/20 rounded-xl p-3 sm:p-4 mb-4">
          <div>
            <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase">Bus</p>
            <p className="text-sm font-bold text-slate-100">{schedule.bus?.busNumber} ({schedule.bus?.type})</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase">Route</p>
            <p className="text-sm font-bold text-slate-100">{schedule.route?.name}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase">Journey</p>
            <p className="text-sm font-bold text-slate-100">{startStop || schedule.route?.stops?.[0] || "Start"} → {endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1] || "End"}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 tracking-wider mb-0.5 uppercase">Departure</p>
            <p className="text-sm font-bold text-slate-100">{schedule.departureDate?.split("T")[0]} at {schedule.departureTime}</p>
          </div>
        </div>

        {step === 1 ? (
          <>
            <div className="bg-slate-900/50 p-4 rounded-3xl border border-slate-800 max-w-sm md:max-w-2xl mx-auto">
              <div className="flex justify-end mb-4 pb-3 border-b border-slate-700/50">
                <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider">DRIVER</span>
              </div>
              <div className="grid grid-cols-5 gap-2 md:gap-4 items-center justify-center">
                {seatList.map((seat, index) => {
                  const isBooked = seat.isBooked || seat.status === "Booked";
                  const isBroken = seat.isBroken || seat.status === "Broken";
                  const isSelected = selectedSeats.includes(seat.seatNumber);
                  const seatDisabled = isBooked || isBroken;
                  return (
                    <Fragment key={seat._id || seat.id}>
                      {index % 4 === 2 && <div />}
                      <button
                        disabled={seatDisabled}
                        onClick={() => toggleSeat(seat.seatNumber)}
                        className={`
                          w-full py-3 md:py-4 text-xs md:text-sm font-semibold rounded-xl
                          transition-all duration-200 select-none flex items-center justify-center
                          ${isSelected
                            ? "bg-emerald-600 text-white shadow-lg scale-95 border-2 border-emerald-500"
                            : isBooked
                              ? "bg-slate-700/60 text-slate-500 line-through cursor-not-allowed border border-slate-700"
                              : isBroken
                                ? "bg-amber-500/80 text-white border border-amber-500 cursor-not-allowed"
                                : "bg-slate-700 hover:bg-emerald-900/40 hover:border-emerald-600 text-slate-200 border border-slate-600 cursor-pointer"
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

            <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 text-xs text-slate-400 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-slate-700 border border-slate-600 rounded" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-emerald-600 rounded shadow-sm" />
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-slate-700/60 border border-slate-700 rounded" />
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-amber-500/80 rounded" />
                <span>Broken</span>
              </div>
            </div>

            {selectedSeats.length === 0 && (
              <div className="flex flex-col gap-3 mt-6">
                <button onClick={() => navigate("/")} className="w-full py-2.5 rounded-xl font-medium text-sm text-slate-300 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border-none">
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

            {!user && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 text-center">
                <p className="text-red-400 text-sm">Please <a href="/login" className="text-blue-400 underline">login</a> to complete your booking.</p>
              </div>
            )}

            <div className="space-y-4 mb-2">
              {[
                { name: "fullName", label: "Full Name *", type: "text", placeholder: "Enter your full name" },
                { name: "email", label: "Email *", type: "email", placeholder: "Enter your email" },
                { name: "phone", label: "Phone Number *", type: "tel", placeholder: "Enter your phone number" },
                { name: "specialRequests", label: "Special Requests", type: "text", placeholder: "Any special requests?" },
              ].map(field => (
                <div key={field.name}>
                  <label className="block mb-1.5 text-xs text-slate-400 font-medium">{field.label}</label>
                  <input
                    type={field.type} name={field.name} value={formData[field.name]}
                    onChange={handleInputChange} placeholder={field.placeholder}
                    required={field.name !== "specialRequests"}
                    className="w-full py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {step === 1 && selectedSeats.length > 0 && (
        <div className="sm:static sm:mt-4 fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 p-3 sm:p-4 sm:bg-slate-800/70 sm:backdrop-blur-xl sm:border sm:border-white/10 sm:rounded-2xl sm:static sm:z-auto">
          <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
            <div className="text-sm text-slate-300 leading-tight">
              <span className="text-emerald-400 font-bold">{selectedSeats.length}</span> seat{selectedSeats.length > 1 ? "s" : ""} selected
              <span className="hidden sm:inline"> — <span className="text-slate-400">{selectedSeats.join(", ")}</span></span>
              <div className="text-[10px] text-slate-500 sm:hidden">{selectedSeats.join(", ")}</div>
              <div className="text-[10px] text-slate-500">Total: <span className="text-emerald-400 font-bold">Rs. {totalFare}</span></div>
            </div>
            <button
              onClick={handleContinue}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-2.5 sm:py-2 sm:px-8 rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-95 whitespace-nowrap cursor-pointer border-none"
            >
              Proceed to Book
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3 mt-2 pb-20 sm:pb-0">
          <button
            onClick={handleBook}
            disabled={booking || !user}
            className={`w-full py-3 sm:py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base text-white transition-all cursor-pointer border-none ${
              booking || !user
                ? "bg-emerald-600/50 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] shadow-lg shadow-emerald-900/30"
            }`}
          >
            {booking ? (
              <span className="inline-flex items-center gap-2">
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
            className="w-full py-2.5 rounded-xl font-medium text-sm text-slate-300 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border-none"
          >
            ← Back to Seats
          </button>
        </div>
      )}

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
