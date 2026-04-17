import { useEffect, useMemo, useState } from 'react';
import pb from '../../lib/pb';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Skeleton from '../../components/ui/Skeleton';
import StatCard from '../../components/ui/StatCard';

const initialRoom = {
  room_code: '',
  building: '',
  capacity: 30,
  room_type: 'Classroom',
};

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(initialRoom);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    setError('');
    try {
      const res = await pb.collection('rooms').getList(1, 100, { sort: 'room_code' });
      setRooms(res.items);
    } catch (err) {
      setError('Failed to load rooms.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRoom(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await pb.collection('rooms').create({
        room_code: form.room_code.trim(),
        building: form.building.trim(),
        capacity: Number(form.capacity),
        room_type: form.room_type,
        equipment: [],
      });

      setForm(initialRoom);
      await loadRooms();
    } catch (err) {
      setError('Failed to create room. Check unique room code and required fields.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRoom(roomId) {
    try {
      await pb.collection('rooms').delete(roomId);
      await loadRooms();
    } catch (err) {
      setError('Failed to delete room.');
      console.error(err);
    }
  }

  const averageCapacity = useMemo(() => {
    if (!rooms.length) return 0;
    const sum = rooms.reduce((total, room) => total + Number(room.capacity || 0), 0);
    return Math.round(sum / rooms.length);
  }, [rooms]);

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton variant="card" className="h-28" count={3} />
        <Skeleton variant="card" className="h-80" />
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Room Management</h1>
        <p className="text-[var(--text-base)] text-[var(--color-text-secondary)]">Create and maintain classroom inventory used by schedules and sessions.</p>
      </header>

      <ErrorBanner message={error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Rooms"
          metric={rooms.length}
          icon={<span className="material-symbols-outlined text-[22px]">meeting_room</span>}
          trendDirection="up"
          delay={0}
        />
        <StatCard
          label="Average Capacity"
          metric={averageCapacity}
          icon={<span className="material-symbols-outlined text-[22px]">groups_2</span>}
          trendDirection="up"
          delay={1}
        />
        <StatCard
          label="Labs"
          metric={rooms.filter((room) => String(room.room_type || '').toLowerCase().includes('lab')).length}
          icon={<span className="material-symbols-outlined text-[22px]">biotech</span>}
          trendDirection="up"
          delay={2}
        />
        <StatCard
          label="Lecture Halls"
          metric={rooms.filter((room) => String(room.room_type || '').toLowerCase().includes('lecture')).length}
          icon={<span className="material-symbols-outlined text-[22px]">chess_queen</span>}
          trendDirection="up"
          delay={3}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card variant="elevated" className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Add Room</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <label className="block text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                Room Code
                <input
                  value={form.room_code}
                  onChange={(event) => setForm((prev) => ({ ...prev, room_code: event.target.value }))}
                  placeholder="D301"
                  aria-label="Room code"
                  className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[var(--text-sm)] text-[var(--color-text-primary)]"
                  required
                />
              </label>

              <label className="block text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                Building
                <input
                  value={form.building}
                  onChange={(event) => setForm((prev) => ({ ...prev, building: event.target.value }))}
                  placeholder="Engineering Building"
                  aria-label="Building name"
                  className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[var(--text-sm)] text-[var(--color-text-primary)]"
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                  Capacity
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
                    aria-label="Room capacity"
                    className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[var(--text-sm)] text-[var(--color-text-primary)]"
                    required
                  />
                </label>

                <label className="block text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                  Type
                  <select
                    value={form.room_type}
                    onChange={(event) => setForm((prev) => ({ ...prev, room_type: event.target.value }))}
                    aria-label="Room type"
                    className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[var(--text-sm)] text-[var(--color-text-primary)]"
                  >
                    <option value="Classroom">Classroom</option>
                    <option value="Lab">Lab</option>
                    <option value="Lecture Hall">Lecture Hall</option>
                  </select>
                </label>
              </div>

              <Button type="submit" loading={saving} fullWidth>
                Create Room
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Registered Rooms</h2>
          </CardHeader>
          <CardBody className="p-0">
            <DataTable
              columns={[
                { key: 'room_code', label: 'Room Code', sortable: true },
                { key: 'building', label: 'Building', sortable: true },
                {
                  key: 'room_type',
                  label: 'Type',
                  render: (value) => <Badge variant="info">{value || 'N/A'}</Badge>,
                },
                { key: 'capacity', label: 'Capacity', sortable: true },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (_, row) => (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteRoom(row.id);
                      }}
                    >
                      Delete
                    </Button>
                  ),
                },
              ]}
              rows={rooms}
              rowKey="id"
              emptyIcon="meeting_room"
              emptyTitle="No rooms found"
              emptySubtitle="Create your first room to start assigning schedules."
            />
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
