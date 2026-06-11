import type { Booking, Car } from '@/types';

interface BookingCardProps {
  booking: Booking;
  onStatusChange?: (
    id: string,
    status: Booking['status']
  ) => void;
}

const getCar = (booking: Booking): Car | null => {
  if (booking.carId && typeof booking.carId === 'object') {
    return booking.carId as Car;
  }

  return null;
};

export default function BookingCard({
  booking,
}: BookingCardProps) {
  const car = getCar(booking);

  return (
    <div className="rt-booking-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <div>
          <h3
            className="rt-booking-card__service"
            style={{
              fontSize: '1.1rem',
              marginBottom: '0.35rem',
            }}
          >
            🔧{' '}
            {booking.serviceType
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          </h3>

          <p className="rt-booking-card__date">
            📅{' '}
            {new Date(
              booking.scheduledDate
            ).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <span
          className={`rt-booking-status rt-booking-status--${booking.status}`}
        >
          {booking.status}
        </span>
      </div>

      {car && (
        <div
          style={{
            background: '#f9fafb',
            padding: '0.75rem',
            borderRadius: '10px',
          }}
        >
          <p
            className="rt-booking-card__car"
            style={{
              margin: 0,
              fontWeight: 500,
            }}
          >
            🚗 {car.year} {car.make} {car.model}
          </p>

          <p
            style={{
              margin: '0.35rem 0 0',
              color: '#6b7280',
              fontSize: '0.85rem',
            }}
          >
            Registration: {car.registrationNumber}
          </p>
        </div>
      )}

      {booking.notes && (
        <div
          style={{
            background: '#f3f4f6',
            padding: '0.75rem',
            borderRadius: '10px',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#4b5563',
            }}
          >
            💬 {booking.notes}
          </p>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e5e7eb',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <span
            style={{
              color: '#6b7280',
              fontSize: '0.85rem',
            }}
          >
            ID:
          </span>

          <span
            style={{
              fontFamily: 'monospace',
              color: '#374151',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {booking._id.slice(-8)}
          </span>
        </div>

        {booking.estimatedCost > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#f0fdf4',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
            }}
          >
            <span
              style={{
                color: '#15803d',
                fontSize: '0.85rem',
              }}
            >
              Est. Cost:
            </span>

            <span
              style={{
                fontWeight: 700,
                color: '#16a34a',
                fontSize: '0.95rem',
              }}
            >
              ₹{booking.estimatedCost}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}