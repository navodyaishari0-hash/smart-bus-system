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
  const btnBase = {
    padding: "0.4rem 0.7rem", borderRadius: "8px", fontSize: "0.75rem",
    display: "inline-flex", alignItems: "center", gap: "0.3rem", cursor: "pointer"
  };
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
      <button onClick={copyLink} title="Copy link" style={{ ...btnBase, border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.08)", color: "var(--text-primary)" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg> Copy
      </button>
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" title="Share on WhatsApp" style={{ ...btnBase, border: "1px solid rgba(37, 211, 102, 0.3)", background: "rgba(37, 211, 102, 0.1)", color: "#25D366", textDecoration: "none" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg> WhatsApp
      </a>
    </div>
  );
}

function BookingSuccessModal({ schedule, selectedSeats, formData, totalFare, startStop, endStop, onViewBookings }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const s = (mobile, desktop) => visible ? mobile : {};
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "1rem",
      background: visible ? "rgba(0,0,0,0.7)" : "transparent",
      backdropFilter: visible ? "blur(4px)" : "none",
      transition: "all 0.4s ease"
    }}>
      <div style={{
        background: "var(--glass-bg)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "24px", padding: "clamp(1.5rem, 5vw, 2.5rem)",
        maxWidth: "480px", width: "100%", textAlign: "center",
        transform: visible ? "scale(1) translateY(0)" : "scale(0.8) translateY(30px)",
        opacity: visible ? 1 : 0, transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: "0 32px 64px rgba(0,0,0,0.5)"
      }}>
        <div style={{
          width: "clamp(60px, 15vw, 80px)", height: "clamp(60px, 15vw, 80px)",
          borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.25rem", border: "3px solid var(--success)"
        }}>
          <svg width="clamp(30px, 8vw, 40px)" height="clamp(30px, 8vw, 40px)" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ color: "var(--success)", margin: "0 0 0.5rem", fontSize: "clamp(1.4rem, 4vw, 1.8rem)" }}>Booking Confirmed!</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          Thank you, <strong style={{ color: "var(--text-primary)" }}>{formData.fullName.split(" ")[0]}</strong>! Your seats are reserved.
        </p>
        <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: "16px", padding: "clamp(1rem, 3vw, 1.5rem)", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", textAlign: "left" }}>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "0.2rem", letterSpacing: "0.5px" }}>ROUTE</p>
              <p style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{schedule.route?.name}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "0.2rem", letterSpacing: "0.5px" }}>JOURNEY</p>
              <p style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{startStop || schedule.route?.stops?.[0] || "–"} → {endStop || schedule.route?.stops?.[schedule.route.stops.length - 1] || "–"}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "0.2rem", letterSpacing: "0.5px" }}>DEPARTURE</p>
              <p style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{schedule.departureDate?.split("T")[0]} {schedule.departureTime}</p>
            </div>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "0.2rem", letterSpacing: "0.5px" }}>SEATS</p>
              <p style={{ fontWeight: "bold", fontSize: "0.85rem", color: "var(--success)" }}>{selectedSeats.join(", ")}</p>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "0.75rem", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Total Paid</span>
            <span style={{ fontWeight: "bold", fontSize: "clamp(1.2rem, 4vw, 1.5rem)", color: "var(--text-primary)" }}>Rs. {totalFare}</span>
          </div>
        </div>
        <button onClick={onViewBookings}
          style={{
            width: "100%", padding: "0.85rem", fontSize: "1rem", fontWeight: "bold",
            background: "var(--success)", color: "white", border: "none",
            borderRadius: "12px", cursor: "pointer"
          }}>
          View My Bookings
        </button>
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

  if (loading) return <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading schedule...</div>;
  if (!schedule) return <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Schedule not found</div>;

  const seatList = schedule.seats && schedule.seats.length > 0 ? schedule.seats : seats;

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: "900px", margin: "1rem", padding: "1.25rem" }} id="book-seats-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Book Your Seats</h3>
        <ShareButtons title={`SmartBus - ${schedule?.bus?.busNumber || ""} ${schedule?.route?.name || ""}`} />
      </div>

      <div className="schedule-info-grid" style={{ background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "12px", marginBottom: "1.5rem" }}>
        <div><p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>Bus</p><p style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{schedule.bus?.busNumber} ({schedule.bus?.type})</p></div>
        <div><p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>Route</p><p style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{schedule.route?.name}</p></div>
        <div><p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>Journey</p><p style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{startStop || schedule.route?.stops?.[0] || "Start"} → {endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1] || "End"}</p></div>
        <div><p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>Departure</p><p style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{schedule.departureDate?.split("T")[0]} at {schedule.departureTime}</p></div>
      </div>

      {step === 1 ? (
        <>
          <h4 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>Step 1: Select Your Seats</h4>
          <div style={{ border: "2px solid var(--glass-border)", borderRadius: "40px 40px 12px 12px", padding: "1.25rem", maxWidth: "500px", margin: "0 auto 1.5rem", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem", borderBottom: "2px solid rgba(255,255,255,0.1)", paddingBottom: "0.75rem" }}>
              <div style={{ padding: "0.4rem 0.9rem", background: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "bold" }}>Driver</div>
            </div>
            <div className="seat-grid">
              {seatList.map((seat, index) => {
                const isBooked = seat.isBooked || seat.status === "Booked";
                const isBroken = seat.isBroken || seat.status === "Broken";
                const isSelected = selectedSeats.includes(seat.seatNumber);
                return (
                  <Fragment key={seat._id || seat.id}>
                    {index % 4 === 2 && <div />}
                    <button disabled={isBooked || isBroken} onClick={() => toggleSeat(seat.seatNumber)}
                      style={{
                        padding: "0.5rem 0.2rem", borderRadius: "8px",
                        border: isSelected ? "2px solid var(--success)" : "1px solid rgba(255,255,255,0.2)",
                        cursor: isBooked || isBroken ? "not-allowed" : "pointer",
                        background: isBroken ? "var(--warning)" : isBooked ? "var(--danger)" : isSelected ? "var(--success)" : "rgba(255,255,255,0.1)",
                        color: "white", fontWeight: "bold", fontSize: "0.8rem",
                        transition: "all 0.2s", boxShadow: isSelected ? "0 0 10px rgba(76, 175, 80, 0.5)" : "inset 0 -3px 0 rgba(0,0,0,0.2)"
                      }}>
                      {seat.seatNumber}
                    </button>
                  </Fragment>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "clamp(0.75rem, 3vw, 2rem)", fontSize: "0.8rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {[
              { bg: "rgba(255,255,255,0.1)", label: "Available" },
              { bg: "var(--success)", label: "Selected" },
              { bg: "var(--danger)", label: "Booked" },
              { bg: "var(--warning)", label: "Broken" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <div style={{ width: "16px", height: "16px", background: item.bg, borderRadius: "4px" }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {selectedSeats.length > 0 && (
            <div style={{ background: "rgba(76, 175, 80, 0.1)", border: "1px solid rgba(76, 175, 80, 0.3)", padding: "0.85rem", borderRadius: "10px", marginBottom: "1.5rem", textAlign: "center" }}>
              <p style={{ color: "var(--success)", fontWeight: "bold", marginBottom: "0.3rem", fontSize: "0.9rem" }}>
                {selectedSeats.length} seat{selectedSeats.length !== 1 ? "s" : ""} selected
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Seats: <strong>{selectedSeats.join(", ")}</strong></p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
                Total: <strong style={{ color: "var(--success)", fontSize: "1rem" }}>Rs. {schedule.fare * selectedSeats.length}</strong>
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button className="btn btn-primary" onClick={handleContinue} disabled={selectedSeats.length === 0}
              style={{ width: "100%", padding: "0.8rem", fontSize: "0.9rem", fontWeight: 600, opacity: selectedSeats.length === 0 ? 0.5 : 1, borderRadius: "12px" }}>
              Continue to Details →
            </button>
            <button className="btn" onClick={() => navigate("/")} style={{ width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: "12px" }}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <h4 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>Step 2: Passenger Details</h4>
          <div style={{ background: "rgba(76, 175, 80, 0.1)", border: "1px solid rgba(76, 175, 80, 0.3)", padding: "0.85rem", borderRadius: "10px", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.85rem", marginBottom: "0.3rem" }}>Selected Seats: <strong>{selectedSeats.join(", ")}</strong></p>
            <p style={{ fontSize: "0.85rem" }}>Total Amount: <strong style={{ color: "var(--success)" }}>Rs. {schedule.fare * selectedSeats.length}</strong></p>
          </div>

          {!user && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "0.85rem", borderRadius: "10px", marginBottom: "1.5rem", textAlign: "center" }}>
              <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>Please <a href="/login" style={{ color: "var(--accent-primary)" }}>login</a> to complete your booking.</p>
            </div>
          )}

          <form className="passenger-form" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            {[
              { name: "fullName", label: "Full Name *", type: "text", placeholder: "Enter your full name" },
              { name: "email", label: "Email *", type: "email", placeholder: "Enter your email" },
              { name: "phone", label: "Phone Number *", type: "tel", placeholder: "Enter your phone number" },
              { name: "specialRequests", label: "Special Requests", type: "text", placeholder: "Any special requests?" },
            ].map(field => (
              <div key={field.name}>
                <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{field.label}</label>
                <input type={field.type} name={field.name} value={formData[field.name]} onChange={handleInputChange} placeholder={field.placeholder} required={field.name !== "specialRequests"}
                  style={{ width: "100%", padding: "0.7rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "0.9rem" }} />
              </div>
            ))}
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button className="btn btn-success" onClick={handleBook} disabled={booking || !user}
              style={{ width: "100%", padding: "0.8rem", fontSize: "0.9rem", fontWeight: 600, borderRadius: "12px", opacity: booking || !user ? 0.5 : 1 }}>
              {booking ? "Processing..." : "Confirm Booking"}
            </button>
            <button className="btn" onClick={() => setStep(1)} style={{ width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: "12px" }}>
              ← Back to Seats
            </button>
          </div>
        </>
      )}

      {showSuccess && (
        <BookingSuccessModal
          schedule={schedule} selectedSeats={selectedSeats} formData={formData}
          totalFare={schedule.fare * selectedSeats.length}
          startStop={startStop || schedule.route?.stops?.[0]}
          endStop={endStop || schedule.route?.stops?.[schedule.route?.stops?.length - 1]}
          onViewBookings={() => navigate("/passenger")}
        />
      )}
    </div>
  );
}
