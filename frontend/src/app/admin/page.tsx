'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import type { Booking, Car } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  totalCars: number;
  totalBookings: number;
  bookingsByStatus: {
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
}

interface PopulatedCar extends Car {
  userId: { _id: string; name: string; email: string } | string;
}

interface PopulatedBooking extends Booking {
  userId: { _id: string; name: string; email: string } | string;
  carId: Car | string;
}

type Tab = 'cars' | 'bookings';

const BOOKING_STATUSES: Booking['status'][] = [
  'pending',
  'confirmed',
  'in-progress',
  'completed',
  'cancelled',
];

const VALID_TRANSITIONS: Record<string, Booking['status'][]> = {
  pending:       ['confirmed', 'cancelled'],
  confirmed:     ['in-progress', 'cancelled'],
  'in-progress': ['completed', 'cancelled'],
  completed:     [],
  cancelled:     [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getOwnerName = (car: PopulatedCar): string => {
  if (car.userId && typeof car.userId === 'object') {
    return `${car.userId.name} (${car.userId.email})`;
  }
  return String(car.userId);
};

const getBookingUser = (b: PopulatedBooking): string => {
  if (b.userId && typeof b.userId === 'object') {
    return b.userId.name;
  }
  return String(b.userId);
};

const getBookingCar = (b: PopulatedBooking): string => {
  if (b.carId && typeof b.carId === 'object') {
    const c = b.carId as Car;
    return `${c.year} ${c.make} ${c.model} — ${c.registrationNumber}`;
  }
  return String(b.carId);
};

// Map BookingStatus keys to the bookingsByStatus object keys in AdminStats.
// The API returns inProgress (camelCase) while the status value is 'in-progress'.
const statusToStatKey = (
  s: Booking['status']
): keyof AdminStats['bookingsByStatus'] => {
  if (s === 'in-progress') return 'inProgress';
  return s as keyof AdminStats['bookingsByStatus'];
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('cars');

  // stats
  const [stats, setStats]               = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // cars tab
  const [cars, setCars]                     = useState<PopulatedCar[]>([]);
  const [carsLoading, setCarsLoading]       = useState(false);
  const [carsPage, setCarsPage]             = useState(1);
  const [carsTotalPages, setCarsTotalPages] = useState(1);
  const [carsTotal, setCarsTotal]           = useState(0);
  const [carsError, setCarsError]           = useState('');

  // bookings tab
  const [bookings, setBookings]                     = useState<PopulatedBooking[]>([]);
  const [bookingsLoading, setBookingsLoading]       = useState(false);
  const [bookingsPage, setBookingsPage]             = useState(1);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(1);
  const [bookingsTotal, setBookingsTotal]           = useState(0);
  const [bookingsError, setBookingsError]           = useState('');
  const [statusFilter, setStatusFilter]             = useState('');

  // ─── Guards ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
    if (!isLoading && isAuthenticated && user?.role !== 'admin')
      router.replace('/dashboard');
  }, [isLoading, isAuthenticated, user, router]);

  // ─── Fetch stats ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    const load = async () => {
      try {
        setStatsLoading(true);
        const res = await api.get('/admin/stats');
        setStats(res.data);
      } catch {
        // silently fail — stats are non-critical
      } finally {
        setStatsLoading(false);
      }
    };
    load();
  }, [isAuthenticated, user]);

  // ─── Fetch cars ───────────────────────────────────────────────────────────────

  const fetchCars = useCallback(async () => {
    try {
      setCarsLoading(true);
      setCarsError('');
      const res = await api.get(`/admin/cars?page=${carsPage}&limit=15`);
      setCars(res.data || []);
      if (res.meta) {
        setCarsTotal(res.meta.total);
        setCarsTotalPages(res.meta.totalPages);
      }
    } catch (err) {
      setCarsError(err instanceof Error ? err.message : 'Failed to load cars');
    } finally {
      setCarsLoading(false);
    }
  }, [carsPage]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && activeTab === 'cars') {
      fetchCars();
    }
  }, [isAuthenticated, user, activeTab, fetchCars]);

  // ─── Fetch bookings ───────────────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    try {
      setBookingsLoading(true);
      setBookingsError('');
      const qs = `page=${bookingsPage}&limit=10${statusFilter ? `&status=${statusFilter}` : ''}`;
      const res = await api.get(`/bookings?${qs}`);
      setBookings(res.data || []);
      if (res.meta) {
        setBookingsTotal(res.meta.total);
        setBookingsTotalPages(res.meta.totalPages);
      }
    } catch (err) {
      setBookingsError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setBookingsLoading(false);
    }
  }, [bookingsPage, statusFilter]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && activeTab === 'bookings') {
      fetchBookings();
    }
  }, [isAuthenticated, user, activeTab, fetchBookings]);

  // ─── Actions ──────────────────────────────────────────────────────────────────

  const handleDeleteCar = async (id: string) => {
    if (!confirm('Delete this car? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/cars/${id}`);

      // Remove from list and decrement count
      setCars((prev) => prev.filter((c) => c._id !== id));
      const newTotal = carsTotal - 1;
      setCarsTotal(newTotal);

      // If this page is now empty and we're not on page 1, go back one page.
      // fetchCars will fire automatically because carsPage changes.
      const itemsOnPage = cars.length - 1; // after removal
      if (itemsOnPage === 0 && carsPage > 1) {
        setCarsPage((p) => p - 1);
      }

      // Keep the stat card in sync
      if (stats) setStats({ ...stats, totalCars: stats.totalCars - 1 });
    } catch (err) {
      setCarsError(err instanceof Error ? err.message : 'Failed to delete car');
    }
  };

  const handleStatusChange = async (id: string, newStatus: Booking['status']) => {
    // Capture the old status before the optimistic update so we can adjust stats
    const oldBooking = bookings.find((b) => b._id === id);
    const oldStatus  = oldBooking?.status;

    try {
      const res = await api.put(`/bookings/${id}/status`, { status: newStatus });

      // Update the booking list optimistically
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: res.data.status } : b))
      );

      // Update the stat cards so the counts reflect the change immediately
      if (stats && oldStatus) {
        const oldKey = statusToStatKey(oldStatus);
        const newKey = statusToStatKey(newStatus);
        setStats({
          ...stats,
          bookingsByStatus: {
            ...stats.bookingsByStatus,
            [oldKey]: Math.max(0, stats.bookingsByStatus[oldKey] - 1),
            [newKey]: stats.bookingsByStatus[newKey] + 1,
          },
        });
      }
    } catch (err) {
      setBookingsError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // ─── Loading / auth guard ─────────────────────────────────────────────────────

  if (isLoading) return <div className="rt-loading">Loading...</div>;
  if (!isAuthenticated || user?.role !== 'admin') return null;

  // ─── Stat cards data ──────────────────────────────────────────────────────────

  const statCards = stats
    ? [
        { label: 'Total Users',    value: stats.totalUsers,                   color: 'var(--rt-blue)'     },
        { label: 'Total Cars',     value: stats.totalCars,                    color: '#7c3aed'             },
        { label: 'Total Bookings', value: stats.totalBookings,                color: 'var(--rt-gray-700)' },
        { label: 'Pending',        value: stats.bookingsByStatus.pending,     color: 'var(--rt-amber)'    },
        { label: 'Confirmed',      value: stats.bookingsByStatus.confirmed,   color: 'var(--rt-blue)'     },
        { label: 'In Progress',    value: stats.bookingsByStatus.inProgress,  color: 'var(--rt-green)'    },
        { label: 'Completed',      value: stats.bookingsByStatus.completed,   color: '#059669'             },
        { label: 'Cancelled',      value: stats.bookingsByStatus.cancelled,   color: 'var(--rt-red)'      },
      ]
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="rt-page">
      <h1 className="rt-page-title">Admin Dashboard</h1>

      {/* ── Stats ── */}
      {statsLoading ? (
        <div className="rt-loading" style={{ minHeight: 100 }}>Loading stats…</div>
      ) : (
        <div
          className="rt-stats-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
        >
          {statCards.map(({ label, value, color }) => (
            <div className="rt-stat-card" key={label}>
              <span className="rt-stat-card__value" style={{ color }}>{value}</span>
              <span className="rt-stat-card__label">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '2px solid var(--rt-gray-200)',
        }}
      >
        {(['cars', 'bookings'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--rt-blue)' : '2px solid transparent',
              marginBottom: '-2px',
              color: activeTab === tab ? 'var(--rt-blue)' : 'var(--rt-gray-500)',
              fontWeight: activeTab === tab ? 700 : 500,
              fontSize: '0.9375rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab === 'cars' ? '🚗 Manage Cars' : '📋 Manage Bookings'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════ CARS TAB ══════════════════════════ */}
      {activeTab === 'cars' && (
        <div>
          <div className="rt-page-header" style={{ marginBottom: '1rem' }}>
            <p style={{ color: 'var(--rt-gray-500)', fontSize: '0.875rem', margin: 0 }}>
              {carsTotal} car{carsTotal !== 1 ? 's' : ''} registered
            </p>
          </div>

          {carsError && <div className="rt-error-banner">{carsError}</div>}

          {carsLoading ? (
            <div className="rt-loading">Loading cars…</div>
          ) : cars.length === 0 ? (
            <div className="rt-empty"><h3>No cars registered</h3></div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--rt-gray-50)', textAlign: 'left' }}>
                      {['Car', 'Registration', 'Fuel', 'Owner', 'Added', 'Actions'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '0.75rem 1rem',
                            color: 'var(--rt-gray-700)',
                            fontWeight: 600,
                            borderBottom: '1px solid var(--rt-gray-200)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cars.map((car, i) => (
                      <tr
                        key={car._id}
                        style={{ background: i % 2 === 0 ? 'white' : 'var(--rt-gray-50)' }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--rt-gray-900)' }}>
                          {car.year} {car.make} {car.model}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--rt-gray-700)' }}>
                          {car.registrationNumber}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <FuelBadge fuelType={car.fuelType} />
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--rt-gray-700)' }}>
                          {getOwnerName(car)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--rt-gray-500)', whiteSpace: 'nowrap' }}>
                          {new Date(car.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <button
                            className="rt-btn rt-btn--danger"
                            style={{ padding: '0.3125rem 0.75rem', fontSize: '0.8125rem' }}
                            onClick={() => handleDeleteCar(car._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {carsTotalPages > 1 && (
                <div className="rt-pagination">
                  <button onClick={() => setCarsPage((p) => p - 1)} disabled={carsPage === 1}>
                    ← Prev
                  </button>
                  <span className="rt-pagination__info">Page {carsPage} of {carsTotalPages}</span>
                  <button onClick={() => setCarsPage((p) => p + 1)} disabled={carsPage === carsTotalPages}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════ BOOKINGS TAB ══════════════════════════ */}
      {activeTab === 'bookings' && (
        <div>
          {/* Filter bar */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <p style={{ color: 'var(--rt-gray-500)', fontSize: '0.875rem', margin: 0 }}>
              {bookingsTotal} booking{bookingsTotal !== 1 ? 's' : ''}
            </p>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setBookingsPage(1); }}
              style={{
                padding: '0.4375rem 0.75rem',
                fontSize: '0.875rem',
                borderRadius: 6,
                border: '1px solid var(--rt-gray-200)',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="">All statuses</option>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())
                  }
                </option>
              ))}
            </select>
          </div>

          {bookingsError && <div className="rt-error-banner">{bookingsError}</div>}

          {bookingsLoading ? (
            <div className="rt-loading">Loading bookings…</div>
          ) : bookings.length === 0 ? (
            <div className="rt-empty"><h3>No bookings found</h3></div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {bookings.map((booking) => (
                  <AdminBookingRow
                    key={booking._id}
                    booking={booking}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>

              {bookingsTotalPages > 1 && (
                <div className="rt-pagination">
                  <button onClick={() => setBookingsPage((p) => p - 1)} disabled={bookingsPage === 1}>
                    ← Prev
                  </button>
                  <span className="rt-pagination__info">Page {bookingsPage} of {bookingsTotalPages}</span>
                  <button onClick={() => setBookingsPage((p) => p + 1)} disabled={bookingsPage === bookingsTotalPages}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const FUEL_COLORS: Record<string, string> = {
  petrol:   '#ef4444',
  diesel:   '#f97316',
  electric: '#22c55e',
  hybrid:   '#3b82f6',
};

function FuelBadge({ fuelType }: { fuelType: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: FUEL_COLORS[fuelType] ?? '#6b7280',
        color: 'white',
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        padding: '0.2rem 0.5rem',
        borderRadius: 4,
      }}
    >
      {fuelType}
    </span>
  );
}

function AdminBookingRow({
  booking,
  onStatusChange,
}: {
  booking: PopulatedBooking;
  onStatusChange: (id: string, status: Booking['status']) => void;
}) {
  const allowed = VALID_TRANSITIONS[booking.status] ?? [];

  return (
    <div
      className="rt-booking-card"
      style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'start' }}
    >
      {/* Left: info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="rt-booking-card__service">
            🔧{' '}
            {booking.serviceType
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
          <span className={`rt-booking-status rt-booking-status--${booking.status}`}>
            {booking.status
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>

        <p className="rt-booking-card__date" style={{ margin: 0 }}>
          📅{' '}
          {new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
          })}
        </p>

        <p className="rt-booking-card__car" style={{ margin: 0 }}>
          🚗 {getBookingCar(booking)}
        </p>

        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--rt-gray-500)' }}>
          👤 {getBookingUser(booking)}
        </p>

        {booking.estimatedCost > 0 && (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>
            ₹{booking.estimatedCost}
          </p>
        )}
      </div>

      {/* Right: status dropdown */}
      <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '0.125rem' }}>
        {allowed.length > 0 ? (
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onStatusChange(booking._id, e.target.value as Booking['status']);
                e.target.value = ''; // reset so it reads as a prompt again
              }
            }}
            style={{
              padding: '0.375rem 0.625rem',
              fontSize: '0.8125rem',
              borderRadius: 6,
              border: '1px solid var(--rt-gray-200)',
              background: 'white',
              color: 'var(--rt-gray-700)',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 130,
            }}
          >
            <option value="" disabled>Change status…</option>
            {allowed.map((s) => (
              <option
                key={s}
                value={s}
                style={{ color: s === 'cancelled' ? 'var(--rt-red)' : 'inherit' }}
              >
                {s
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: '0.8125rem', color: 'var(--rt-gray-500)', paddingTop: '0.25rem' }}>
            {booking.status === 'completed' ? '✅ Done' : '🚫 Closed'}
          </span>
        )}
      </div>
    </div>
  );
}