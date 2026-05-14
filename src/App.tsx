import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  LogOut, 
  LogIn, 
  Trash2, 
  Edit3, 
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, googleProvider, signInWithPopup, signOut } from './firebase';
import { Room, Reservation, OperationType } from './types';
import { handleFirestoreError } from './utils';

// --- Components ---

const Sidebar = ({ user, activeTab, setActiveTab }: { user: User | null, activeTab: 'all' | 'mine', setActiveTab: (t: 'all' | 'mine') => void }) => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <aside className="w-64 bg-[#001D40] text-white flex flex-col shrink-0">
      <div className="p-6 border-b border-white/10">
        <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-sm flex items-center justify-center font-black">T</div>
          THALES <span className="font-light opacity-80">Connect</span>
        </div>
      </div>
      <nav className="flex-1 py-6">
        <div className="px-6 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Menu Principal</p>
        </div>
        <div className="flex flex-col space-y-1 px-3">
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors w-full text-left ${activeTab === 'all' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}
          >
            <Calendar className="w-5 h-5 opacity-70" />
            Planning Salle
          </button>
          <button 
            onClick={() => user && setActiveTab('mine')}
            disabled={!user}
            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors w-full text-left ${activeTab === 'mine' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'} disabled:opacity-20`}
          >
            <CheckCircle2 className="w-5 h-5 opacity-70" />
            Mes Réservations
          </button>
        </div>
      </nav>
      <div className="p-4 border-t border-white/10">
        <button 
          onClick={() => {
            if (!user) return alert("Veuillez vous connecter");
            // App state will handle the actual modal launch via a shared method or triggering a room selection
            window.dispatchEvent(new CustomEvent('open-booking'));
          }}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-md font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 mb-4"
        >
          <Plus size={18} />
          Réserver la Salle
        </button>
        <div className="h-px bg-white/10 mb-4" />
        {user ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border border-white/20" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center font-bold text-sm">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || "?"}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user.displayName || "Employé"}</p>
                <p className="text-xs text-white/50 truncate">Connecté</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2.5 rounded-md font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
          >
            <LogIn size={18} />
            Connexion
          </button>
        )}
      </div>
    </aside>
  );
};

const ReservationModal = ({ 
  isOpen, 
  onClose, 
  room, 
  user 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  room: Room | null;
  user: User | null;
}) => {
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [participants, setParticipants] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !user) return;

    setLoading(true);
    setError("");

    const startDateTime = `${date}T${startTime}:00`;
    const endDateTime = `${date}T${endTime}:00`;

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      setError("L'heure de fin doit être après l'heure de début.");
      setLoading(false);
      return;
    }

    try {
      const resData = {
        roomId: room.id,
        subject,
        startTime: startDateTime,
        endTime: endDateTime,
        organizerId: user.uid,
        organizerName: user.displayName || user.email || "Unknown",
        organizerEmail: user.email || "",
        participants: participants.split(",").map(p => p.trim()).filter(p => p),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, "reservations"), resData);
      onClose();
      setSubject("");
      setParticipants("");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "reservations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#001D40]/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-slate-200"
          >
            <div className="bg-[#001D40] p-5 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Plus size={20} className="text-blue-400" />
                Nouvelle Réservation
              </h3>
              <p className="text-xs text-white/50 mt-1 uppercase tracking-widest font-semibold">{room?.name}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-start gap-2 text-[11px] border border-red-100 font-bold">
                  <AlertCircle size={14} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sujet de la réunion</label>
                <input 
                  required
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="ex: Review Sprint Architecture"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Date</label>
                  <input 
                    required
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Début</label>
                  <input 
                    required
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Fin</label>
                  <input 
                    required
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Participants (sép. par virgule)</label>
                <textarea 
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  placeholder="Jean D., Marie L., Claude T."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-slate-500 rounded-md hover:bg-slate-50 transition-colors font-bold text-sm border border-slate-200"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#001D40] text-white rounded-md hover:bg-blue-900 transition-colors font-bold text-sm shadow-lg shadow-blue-900/20 disabled:bg-slate-300"
                >
                  {loading ? "Chargement..." : "Réserver la salle"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN'];

const getWeekDays = (now: Date) => {
  const start = new Date(now);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(start.setDate(diff));
  
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [now, setNow] = useState(new Date());

  const weekDays = useMemo(() => getWeekDays(now), [now]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const qRooms = query(collection(db, "rooms"));
    const unsubscribeRooms = onSnapshot(qRooms, (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(roomList);
      if (roomList.length === 0) {
        const initialRooms = [
          { name: "Salle A102 (Vivaldi)", capacity: 12, equipment: ["Vidéoprojecteur", "Tableau Blanc"] },
          { name: "Espace Innovation", capacity: 8, equipment: ["Écran tactile", "Machine à café"] },
          { name: "Boardroom Delta", capacity: 20, equipment: ["Visioconférence", "Micro-pieuvres"] },
          { name: "Focus Room 1", capacity: 2, equipment: ["Réduction sonore"] },
        ];
        initialRooms.forEach(r => addDoc(collection(db, "rooms"), r));
      }
    });

    const qReservations = query(collection(db, "reservations"), orderBy("startTime", "asc"));
    const unsubscribeReservations = onSnapshot(qReservations, (snapshot) => {
      setReservations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));
    }, (err) => {
       handleFirestoreError(err, OperationType.GET, "reservations");
    });

    return () => {
      clearInterval(timer);
      unsubscribeAuth();
      unsubscribeRooms();
      unsubscribeReservations();
    };
  }, []);

  const handleDeleteReservation = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette réservation ?")) {
      try {
        await deleteDoc(doc(db, "reservations", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `reservations/${id}`);
      }
    }
  };

  const filteredReservations = activeTab === 'mine' 
    ? reservations.filter(r => r.organizerId === user?.uid)
    : reservations;

  useEffect(() => {
    const handleOpenBooking = () => {
      if (rooms.length > 0) {
        setSelectedRoom(rooms[0]);
        setIsModalOpen(true);
      }
    };
    window.addEventListener('open-booking', handleOpenBooking);
    return () => window.removeEventListener('open-booking', handleOpenBooking);
  }, [rooms]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <Sidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-[#001D40]">{rooms[0]?.name || "Thalès Room Connect"}</h2>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider shadow-sm">Cloud Edition</span>
          </div>
          <div className="flex items-center gap-6">
            <button 
               onClick={() => {
                 if (!user) return alert("Connexion requise");
                 if (rooms.length > 0) {
                   setSelectedRoom(rooms[0]);
                   setIsModalOpen(true);
                 }
               }}
               className="bg-[#001D40] text-white px-4 py-2 rounded text-xs font-bold hover:bg-blue-900 transition-all flex items-center gap-2"
            >
              <Plus size={14} strokeWidth={3} />
              Nouveau Créneau
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium whitespace-nowrap">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
              {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">
          {/* Main Planning Section - TIMELINE VIEW */}
          <section className="col-span-9 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Calendar size={16} className="text-blue-600" />
                Planning d'Occupation
              </h3>
              <div className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded">
                Semaine du {weekDays[0].toLocaleDateString()} au {weekDays[4].toLocaleDateString()}
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-5 divide-x divide-slate-100 overflow-hidden">
              {weekDays.map((dayDate, idx) => {
                const dayStr = dayDate.toISOString().split('T')[0];
                const dayReservations = filteredReservations.filter(r => r.startTime.startsWith(dayStr));
                const isToday = dayStr === now.toISOString().split('T')[0];

                return (
                  <div key={idx} className="flex flex-col min-w-0">
                    <div className={`h-10 flex items-center justify-center border-b border-slate-100 font-bold text-[11px] ${isToday ? 'bg-blue-100 text-blue-800' : 'bg-slate-50 text-slate-500'}`}>
                      {DAYS[idx]} {dayDate.getDate()}
                      {isToday && <span className="ml-1 w-1 h-1 bg-blue-600 rounded-full animate-ping" />}
                    </div>
                    
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-white/50 custom-scrollbar">
                      {dayReservations.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-[10px] text-slate-200 font-medium whitespace-nowrap overflow-hidden">Libre</p>
                        </div>
                      ) : (
                        dayReservations.map(res => {
                          const isNow = new Date() >= new Date(res.startTime) && new Date() <= new Date(res.endTime);
                          const formatTime = (iso: string) => iso.split('T')[1].substring(0, 5);

                          return (
                            <motion.div 
                              key={res.id}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-2 rounded-lg text-[10px] border-l-4 shadow-sm group relative ${
                                isNow 
                                  ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200' 
                                  : 'bg-blue-50 border-blue-500 hover:bg-blue-100 transition-colors'
                              }`}
                            >
                              <p className="font-bold text-slate-800 truncate mb-0.5 uppercase">{res.subject}</p>
                              <div className="flex items-center gap-1 text-blue-600 font-bold opacity-80 mb-1">
                                <Clock size={10} />
                                {formatTime(res.startTime)} - {formatTime(res.endTime)}
                              </div>
                              <p className="text-slate-500 italic truncate">Par {res.organizerName}</p>
                              
                              {user?.uid === res.organizerId && (
                                <button 
                                  onClick={() => handleDeleteReservation(res.id)}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all bg-white rounded-full shadow-sm"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Side Info Panel */}
          <section className="col-span-3 flex flex-col gap-6 overflow-hidden">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col overflow-hidden">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                Détails de la Salle
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                   <h4 className="font-black text-[#001D40] text-lg mb-1 leading-tight">{rooms[0]?.name}</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Salle de Prestige</p>
                   
                   <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white p-2 rounded border border-slate-100">
                         <p className="text-[8px] text-slate-400 font-bold uppercase">Capacité</p>
                         <p className="text-sm font-black text-blue-600">{rooms[0]?.capacity} Pers.</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-100">
                         <p className="text-[8px] text-slate-400 font-bold uppercase">Statut</p>
                         <p className="text-sm font-black text-green-600">Ouvert</p>
                      </div>
                   </div>

                   <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Équipements :</p>
                      <div className="flex flex-wrap gap-1">
                        {rooms[0]?.equipment.map((eq, i) => (
                          <span key={i} className="text-[9px] bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium shadow-sm">
                            {eq}
                          </span>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center border-dashed">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 mx-auto">
                    <Clock className="text-orange-500" size={20} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tighter">Vérification Cloud</h4>
                  <p className="text-[9px] text-slate-500 mt-2 px-2 leading-relaxed">
                    Les créneaux sont limités à 2h par défaut pour assurer la disponibilité à tous les collaborateurs.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#001D40] rounded-xl p-5 text-white shadow-xl shadow-blue-900/20">
               <h4 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">Support IT Thalès</h4>
               <p className="text-[11px] leading-relaxed mb-4">Besoin d'aide avec les équipements de la salle ? Contactez l'extension 2404.</p>
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold uppercase">Ligne directe disponible</span>
               </div>
            </div>
          </section>
        </div>
      </main>

      <ReservationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        room={selectedRoom}
        user={user}
      />
    </div>
  );
}

