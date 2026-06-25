import { useState, useEffect, Fragment } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import useAuthStore from "../store/authStore";
function ShareButtons({ url, title }) {
  const shareUrl = url || window.location.href;
  const encoded = encodeURIComponent(shareUrl);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(title + " " + shareUrl)}`;
  const copyLink = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        alert("Link copied! Share it with your friend.");
      })
      .catch(() => {
        prompt("Copy this link:", shareUrl);
      });
  };
  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {" "}
      <button
        onClick={copyLink}
        title="Copy link"
        style={{
          padding: "0.4rem 0.8rem",
          borderRadius: "8px",
          border: "1px solid var(--glass-border)",
          background: "rgba(255,255,255,0.08)",
          color: "var(--text-primary)",
          cursor: "pointer",
          fontSize: "0.8rem",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
        }}
      >
        {" "}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>{" "}
        Copy Link{" "}
      </button>{" "}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on WhatsApp"
        style={{
          padding: "0.4rem 0.8rem",
          borderRadius: "8px",
          border: "1px solid rgba(37, 211, 102, 0.3)",
          background: "rgba(37, 211, 102, 0.1)",
          color: "#25D366",
          cursor: "pointer",
          fontSize: "0.8rem",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
        }}
      >
        {" "}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>{" "}
        WhatsApp{" "}
      </a>{" "}
    </div>
  );
}
function BookingSuccessModal({
  schedule,
  selectedSeats,
  formData,
  totalFare,
  startStop,
  endStop,
  onViewBookings,
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
        background: visible ? "rgba(0,0,0,0.7)" : "transparent",
        backdropFilter: visible ? "blur(4px)" : "none",
        transition: "all 0.4s ease",
      }}
    >
      {" "}
      <div
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "24px",
          padding: "2.5rem",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
          transform: visible
            ? "scale(1) translateY(0)"
            : "scale(0.8) translateY(30px)",
          opacity: visible ? 1 : 0,
          transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
        }}
      >
        {" "}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            border: "3px solid var(--success)",
          }}
        >
          {" "}
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {" "}
            <polyline points="20 6 9 17 4 12" />{" "}
          </svg>{" "}
        </div>{" "}
        <h2
          style={{
            color: "var(--success)",
            margin: "0 0 0.5rem",
            fontSize: "1.8rem",
          }}
        >
          Booking Confirmed!
        </h2>{" "}
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "2rem",
            fontSize: "0.95rem",
          }}
        >
          {" "}
          Thank you,{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {formData.fullName.split(" ")[0]}
          </strong>
          ! Your seats are reserved.{" "}
        </p>{" "}
        <div
          style={{
            background: "rgba(0,0,0,0.25)",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          {" "}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              textAlign: "left",
            }}
          >
            {" "}
            <div>
              {" "}
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                ROUTE
              </p>{" "}
              <p style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                {schedule.route?.name}
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                JOURNEY
              </p>{" "}
              <p style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                {" "}
                {startStop || schedule.route?.stops?.[0] || "–"} →{" "}
                {endStop ||
                  schedule.route?.stops?.[schedule.route.stops.length - 1] ||
                  "–"}{" "}
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                DEPARTURE
              </p>{" "}
              <p style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                {" "}
                {schedule.departureDate?.split("T")[0]}{" "}
                {schedule.departureTime}{" "}
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                SEATS
              </p>{" "}
              <p
                style={{
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  color: "var(--success)",
                }}
              >
                {selectedSeats.join(", ")}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.1)",
              marginTop: "1rem",
              paddingTop: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {" "}
            <span
              style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}
            >
              Total Paid
            </span>{" "}
            <span
              style={{
                fontWeight: "bold",
                fontSize: "1.5rem",
                color: "var(--text-primary)",
              }}
            >
              Rs. {totalFare}
            </span>{" "}
          </div>{" "}
        </div>{" "}
        <button
          onClick={onViewBookings}
          className="btn btn-success"
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1.05rem",
            fontWeight: "bold",
          }}
        >
          {" "}
          View My Bookings{" "}
        </button>{" "}
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {" "}
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginBottom: "0.5rem",
            }}
          >
            SHARE WITH FRIEND
          </p>{" "}
          <div
            style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}
          >
            {" "}
            <button
              onClick={() => {
                const url = window.location.href.split("?")[0];
                navigator.clipboard
                  .writeText(url)
                  .then(() => alert("Link copied!"));
              }}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "8px",
                border: "1px solid var(--glass-border)",
                background: "rgba(255,255,255,0.08)",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              {" "}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>{" "}
              Copy Link{" "}
            </button>{" "}
            <a
              href={`https://wa.me/?text=${encodeURIComponent("SmartBus Booking - " + window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "8px",
                border: "1px solid rgba(37, 211, 102, 0.3)",
                background: "rgba(37, 211, 102, 0.1)",
                color: "#25D366",
                cursor: "pointer",
                fontSize: "0.8rem",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              {" "}
              WhatsApp{" "}
            </a>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
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
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    specialRequests: "",
  });
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schedRes, seatsRes] = await Promise.all([
          axios.get(
            `/api/schedules/${scheduleId}?origin=${startStop || ""}&destination=${endStop || ""}`,
          ),
          axios.get(`/api/schedules/${scheduleId}/seats`),
        ]);
        setSchedule(schedRes.data);
        setSeats(seatsRes.data);
      } catch (err) {
        console.error(err);
        alert("Failed to load schedule details");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [scheduleId, startStop, endStop, navigate]);
  const toggleSeat = (seatNumber) => {
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNumber));
    } else {
      setSelectedSeats([...selectedSeats, seatNumber]);
    }
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
    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim()
    ) {
      return alert("Please fill in all passenger details");
    }
    if (!user) {
      return alert("Please login to book seats");
    }
    setBooking(true);
    try {
      await axios.post(
        "/api/bookings",
        {
          scheduleId,
          seatsToBook: selectedSeats,
          passengerDetails: formData,
          startStop: startStop || schedule.route?.stops[0],
          endStop:
            endStop || schedule.route?.stops[schedule.route?.stops.length - 1],
        },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      setBooking(false);
      setShowSuccess(true);
    } catch (error) {
      setBooking(false);
      alert(error.response?.data?.message || "Booking failed");
    }
  };
  if (loading)
    return (
      <div
        style={{
          padding: "4rem",
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        Loading schedule...
      </div>
    );
  if (!schedule)
    return (
      <div
        style={{
          padding: "4rem",
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        Schedule not found
      </div>
    );
  const seatList = schedule.seats && schedule.seats.length > 0 ? schedule.seats : seats;
  return (
    <div
      className="glass-panel animate-fade-in"
      style={{ maxWidth: "900px", margin: "2rem auto", padding: "2rem" }}
      id="book-seats-page"
    >
      {" "}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {" "}
        <h3 style={{ margin: 0 }}>Book Your Seats</h3>{" "}
        <ShareButtons
          title={`SmartBus - ${schedule?.bus?.busNumber || ""} ${schedule?.route?.name || ""}`}
        />{" "}
      </div>{" "}
      <div
        className="schedule-info-grid"
        style={{
          background: "rgba(255,255,255,0.05)",
          padding: "1.5rem",
          borderRadius: "12px",
          marginBottom: "2rem",
        }}
      >
        {" "}
        <div style={{ fontSize: "0.95rem" }}>
          {" "}
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.8rem",
              marginBottom: "0.3rem",
            }}
          >
            Bus
          </p>{" "}
          <p style={{ fontWeight: "bold" }}>
            {schedule.bus?.busNumber} ({schedule.bus?.type})
          </p>{" "}
        </div>{" "}
        <div style={{ fontSize: "0.95rem" }}>
          {" "}
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.8rem",
              marginBottom: "0.3rem",
            }}
          >
            Route
          </p>{" "}
          <p style={{ fontWeight: "bold" }}>{schedule.route?.name}</p>{" "}
        </div>{" "}
        <div style={{ fontSize: "0.95rem" }}>
          {" "}
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.8rem",
              marginBottom: "0.3rem",
            }}
          >
            Journey
          </p>{" "}
          <p style={{ fontWeight: "bold" }}>
            {" "}
            {startStop || schedule.route?.stops?.[0] || "Start"} →{" "}
            {endStop ||
              schedule.route?.stops?.[schedule.route?.stops?.length - 1] ||
              "End"}{" "}
          </p>{" "}
        </div>{" "}
        <div style={{ fontSize: "0.95rem" }}>
          {" "}
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.8rem",
              marginBottom: "0.3rem",
            }}
          >
            Departure
          </p>{" "}
          <p style={{ fontWeight: "bold" }}>
            {schedule.departureDate?.split("T")[0]} at {schedule.departureTime}
          </p>{" "}
        </div>{" "}
      </div>{" "}
      {step === 1 ? (
        <>
          {" "}
          <h4 style={{ marginBottom: "1rem" }}>
            Step 1: Select Your Seats
          </h4>{" "}
          <div
            style={{
              border: "2px solid var(--glass-border)",
              borderRadius: "40px 40px 12px 12px",
              padding: "2rem",
              maxWidth: "500px",
              margin: "0 auto 2rem",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            {" "}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "2rem",
                borderBottom: "2px solid rgba(255,255,255,0.1)",
                paddingBottom: "1rem",
              }}
            >
              {" "}
              <div
                style={{
                  padding: "0.5rem 1rem",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                }}
              >
                {" "}
                Driver{" "}
              </div>{" "}
            </div>{" "}
            <div className="seat-grid">
              {" "}
              {seatList.map((seat, index) => {
                const isBooked = seat.isBooked || seat.status === "Booked";
                const isBroken = seat.isBroken || seat.status === "Broken";
                const isSelected = selectedSeats.includes(seat.seatNumber);
                return (
                  <Fragment key={seat._id || seat.id}>
                    {" "}
                    {index % 4 === 2 && <div />}{" "}
                    <button
                      disabled={isBooked || isBroken}
                      onClick={() => toggleSeat(seat.seatNumber)}
                      style={{
                        padding: "0.5rem 0.2rem",
                        borderRadius: "8px",
                        border: isSelected
                          ? "2px solid var(--success)"
                          : "1px solid rgba(255,255,255,0.2)",
                        cursor:
                          isBooked || isBroken ? "not-allowed" : "pointer",
                        background: isBroken
                          ? "var(--warning)"
                          : isBooked
                            ? "var(--danger)"
                            : isSelected
                              ? "var(--success)"
                              : "rgba(255,255,255,0.1)",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "0.85rem",
                        transition: "all 0.2s",
                        boxShadow: isSelected
                          ? "0 0 10px rgba(76, 175, 80, 0.5)"
                          : "inset 0 -3px 0 rgba(0,0,0,0.2)",
                      }}
                    >
                      {" "}
                      {seat.seatNumber}{" "}
                    </button>{" "}
                  </Fragment>
                );
              })}{" "}
            </div>{" "}
          </div>{" "}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "2rem",
              fontSize: "0.85rem",
              marginBottom: "2rem",
              flexWrap: "wrap",
            }}
          >
            {" "}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {" "}
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                }}
              ></div>{" "}
              <span>Available</span>{" "}
            </div>{" "}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {" "}
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  background: "var(--success)",
                  borderRadius: "4px",
                }}
              ></div>{" "}
              <span>Selected</span>{" "}
            </div>{" "}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {" "}
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  background: "var(--danger)",
                  borderRadius: "4px",
                }}
              ></div>{" "}
              <span>Booked</span>{" "}
            </div>{" "}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {" "}
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  background: "var(--warning)",
                  borderRadius: "4px",
                }}
              ></div>{" "}
              <span>Broken</span>{" "}
            </div>{" "}
          </div>{" "}
          {selectedSeats.length > 0 && (
            <div
              style={{
                background: "rgba(76, 175, 80, 0.1)",
                border: "1px solid rgba(76, 175, 80, 0.3)",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "2rem",
                textAlign: "center",
              }}
            >
              {" "}
              <p
                style={{
                  color: "var(--success)",
                  fontWeight: "bold",
                  marginBottom: "0.5rem",
                }}
              >
                {selectedSeats.length} seat
                {selectedSeats.length !== 1 ? "s" : ""} selected
              </p>{" "}
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Seats: <strong>{selectedSeats.join(", ")}</strong>
              </p>{" "}
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  marginTop: "0.5rem",
                }}
              >
                Total:{" "}
                <strong style={{ color: "var(--success)", fontSize: "1.1rem" }}>
                  Rs. {schedule.fare * selectedSeats.length}
                </strong>
              </p>{" "}
            </div>
          )}{" "}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            {" "}
            <button
              className="btn"
              onClick={() => navigate("/")}
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              {" "}
              Cancel{" "}
            </button>{" "}
            <button
              className="btn btn-primary"
              onClick={handleContinue}
              disabled={selectedSeats.length === 0}
            >
              {" "}
              Continue to Details →{" "}
            </button>{" "}
          </div>{" "}
        </>
      ) : (
        <>
          {" "}
          <h4 style={{ marginBottom: "1rem" }}>
            Step 2: Passenger Details
          </h4>{" "}
          <div
            style={{
              background: "rgba(76, 175, 80, 0.1)",
              border: "1px solid rgba(76, 175, 80, 0.3)",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "2rem",
            }}
          >
            {" "}
            <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
              Selected Seats: <strong>{selectedSeats.join(", ")}</strong>
            </p>{" "}
            <p style={{ fontSize: "0.9rem" }}>
              Total Amount:{" "}
              <strong style={{ color: "var(--success)" }}>
                Rs. {schedule.fare * selectedSeats.length}
              </strong>
            </p>{" "}
          </div>{" "}
          {!user && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "2rem",
                textAlign: "center",
              }}
            >
              {" "}
              <p style={{ color: "var(--danger)" }}>
                Please{" "}
                <a href="/login" style={{ color: "var(--accent-primary)" }}>
                  login
                </a>{" "}
                to complete your booking.
              </p>{" "}
            </div>
          )}{" "}
          <form
            className="passenger-form"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            {" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                }}
              >
                Full Name *
              </label>{" "}
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                }}
              >
                Email *
              </label>{" "}
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                }}
              >
                Phone Number *
              </label>{" "}
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                }}
              >
                Special Requests
              </label>{" "}
              <input
                type="text"
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleInputChange}
                placeholder="Any special requests?"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                }}
              />{" "}
            </div>{" "}
          </form>{" "}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            {" "}
            <button
              className="btn"
              onClick={() => setStep(1)}
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              {" "}
              ← Back to Seats{" "}
            </button>{" "}
            <button
              className="btn btn-success"
              onClick={handleBook}
              disabled={booking || !user}
              style={{ minWidth: "200px" }}
            >
              {" "}
              {booking ? "Processing..." : "Confirm Booking"}{" "}
            </button>{" "}
          </div>{" "}
        </>
      )}{" "}
      {showSuccess && (
        <BookingSuccessModal
          schedule={schedule}
          selectedSeats={selectedSeats}
          formData={formData}
          totalFare={schedule.fare * selectedSeats.length}
          startStop={startStop || schedule.route?.stops?.[0]}
          endStop={
            endStop || schedule.route?.stops?.[schedule.route.stops.length - 1]
          }
          onViewBookings={() => navigate("/passenger")}
        />
      )}{" "}
    </div>
  );
}
