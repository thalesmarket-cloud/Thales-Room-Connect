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
  AlertCircle,
  Settings,
  Search,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, googleProvider, signInWithPopup, signOut } from './firebase';
import { Room, Reservation, OperationType, Employee } from './types';
import { handleFirestoreError } from './utils';

// --- Components ---

const Sidebar = ({ 
  user, 
  activeTab, 
  setActiveTab,
  reservations,
  currentEmployee
}: { 
  user: User | null; 
  activeTab: 'all' | 'mine' | 'admin'; 
  setActiveTab: (t: 'all' | 'mine' | 'admin') => void;
  reservations: Reservation[];
  currentEmployee: Employee | null;
}) => {
  const isAdmin = user?.email === "thales.market@gmail.com";
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
            className={`flex items-center justify-between px-4 py-3 rounded-md transition-colors w-full text-left ${activeTab === 'mine' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'} disabled:opacity-20`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 opacity-70" />
              Mes Réservations
            </div>
            {user && currentEmployee && (
              <span className="bg-blue-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full animate-in fade-in zoom-in duration-300">
                {reservations.filter(r => {
                  const fullName = `${currentEmployee.firstName} ${currentEmployee.lastName}`.trim().toLowerCase();
                  return r.organizerId === user.uid || r.participants.some(p => p.trim().toLowerCase() === fullName);
                }).length}
              </span>
            )}
          </button>
          
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors w-full text-left ${activeTab === 'admin' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}
            >
              <Settings className="w-5 h-5 opacity-70" />
              Panel Admin (Employés)
            </button>
          )}
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
  const [participants, setParticipants] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen && user) {
      // Fetch all employees for invitation
      const q = query(collection(db, "employees"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployees(list);
        
        // Find current user's profile
        const profile = list.find(emp => emp.userId === user.uid || emp.email === user.email);
        if (profile) setCurrentEmployee(profile);
      });
      return unsubscribe;
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !user || !currentEmployee) return;

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
        organizerName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
        organizerEmail: currentEmployee.email,
        participants: participants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, "reservations"), resData);

      // Identify selected participants' emails for notification
      const participantsData = employees
        .filter(emp => participants.includes(`${emp.firstName} ${emp.lastName}`))
        .map(emp => ({ name: `${emp.firstName} ${emp.lastName}`, email: emp.email }));

      if (participantsData.length > 0) {
        // Call backend API to send emails
        fetch("/api/send-invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject,
            roomName: room.name,
            startTime: startDateTime,
            endTime: endDateTime,
            organizerName: resData.organizerName,
            participants: participantsData
          })
        }).then(async res => {
          if (!res.ok) {
            const data = await res.json();
            alert(`Attention : Les invitations mail n'ont pas pu être envoyées. ${data.error || ""}`);
          }
        }).catch(err => {
          console.error("Failed to send notification emails:", err);
        });
      }

      onClose();
      setSubject("");
      setParticipants([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "reservations");
    } finally {
      setLoading(false);
    }
  };

  // Exclude current user from invitation list
  const filteredEmployees = employees
    .filter(emp => emp.userId !== user?.uid && emp.email !== currentEmployee?.email)
    .filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()));

  const toggleParticipant = (name: string) => {
    if (participants.includes(name)) {
      setParticipants(prev => prev.filter(p => p !== name));
    } else {
      setParticipants(prev => [...prev, name]);
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
            className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-10 border border-slate-200"
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

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Organisateur</label>
                <div className="flex items-center gap-2 text-sm font-black text-blue-900">
                   <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">
                      {currentEmployee?.firstName[0]}{currentEmployee?.lastName[0]}
                   </div>
                   {currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : "Chargement..."}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sujet de la réunion</label>
                <input 
                  required
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="ex: Review Sprint Architecture"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium"
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

                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex justify-between items-center">
                    Invités
                    <span className="text-[9px] font-normal lowercase opacity-60">Liste des collaborateurs</span>
                  </label>
                  <div 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md flex flex-wrap gap-1 cursor-pointer min-h-[42px] bg-white hover:border-blue-400 transition-colors shadow-sm"
                  >
                    {participants.length === 0 ? (
                      <span className="text-sm text-slate-400">Sélectionner des invités...</span>
                    ) : (
                      participants.map((p, i) => (
                        <span key={i} className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          {p}
                          <button type="button" onClick={(e) => { e.stopPropagation(); toggleParticipant(p); }} className="hover:text-red-200 ml-1">&times;</button>
                        </span>
                      ))
                    )}
                  </div>

                  <AnimatePresence>
                    {showDropdown && (
                      <>
                        <div className="fixed inset-0 z-[140]" onClick={() => setShowDropdown(false)} />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-2xl z-[150] max-h-80 overflow-hidden flex flex-col"
                        >
                        <div className="bg-slate-50 p-2 border-b border-slate-100">
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text"
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              placeholder="Filtrez par nom..."
                              className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                          {filteredEmployees.length === 0 ? (
                            <div className="px-4 py-6 text-xs text-slate-400 text-center italic">Aucun collaborateur trouvé</div>
                          ) : (
                            <div className="py-1">
                              {filteredEmployees.map((emp) => {
                                const name = `${emp.firstName} ${emp.lastName}`;
                                const isSelected = participants.includes(name);
                                return (
                                  <div 
                                    key={emp.id}
                                    onClick={(e) => { e.stopPropagation(); toggleParticipant(name); }}
                                    className={`px-4 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-all border-b border-slate-50 last:border-0 ${isSelected ? 'text-blue-700 bg-blue-50 font-black' : 'text-slate-600 hover:bg-slate-50'}`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm">{name}</span>
                                      <span className="text-[9px] opacity-60 font-normal">{emp.position || "Membre Thales"}</span>
                                    </div>
                                    {isSelected ? <CheckCircle2 size={16} className="text-blue-600" /> : <div className="w-4 h-4 rounded-full border border-slate-200" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
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
                  disabled={loading || !currentEmployee}
                  className="flex-1 px-4 py-2 bg-[#001D40] text-white rounded-md hover:bg-blue-900 transition-colors font-bold text-sm shadow-lg shadow-blue-900/20 disabled:bg-slate-300"
                >
                  {loading ? "Chargement..." : "Confirmer"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const RegistrationModal = ({ 
  isOpen, 
  user,
  onComplete
}: { 
  isOpen: boolean; 
  user: User | null;
  onComplete: (emp: Employee) => void;
}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      const names = user.displayName?.split(' ') || [];
      setFirstName(names[0] || "");
      setLastName(names.slice(1).join(' ') || "");
      setEmail(user.email || "");
      setPosition("Collaborateur Thales");
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const newEmp = {
        firstName,
        lastName,
        email,
        position,
        userId: user.uid,
        registeredAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, "employees"), newEmp);
      onComplete({ id: docRef.id, ...newEmp } as Employee);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "employees");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#001D40]/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
          >
            <div className="bg-[#001D40] p-8 text-white text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/10">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-black">Finaliser votre Profil</h3>
              <p className="text-sm text-white/60 mt-2">Bienvenue chez Thalès Room Connect. Merci de compléter vos informations professionnelles.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Prénom</label>
                  <input 
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nom</label>
                  <input 
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email Professionnel (Outlook...)</label>
                <input 
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre.nom@thalesgroup.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Fonction ou poste occupé</label>
                <input 
                  required
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="Ex: Ingénieur Système"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium bg-white"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#001D40] text-white py-3 rounded-lg font-bold hover:bg-blue-900 transition-all shadow-xl shadow-blue-900/20 disabled:bg-slate-300 mt-4"
              >
                {loading ? "Création du profil..." : "Commencer à utiliser Connect"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const InvitationBanner = ({ 
  invitations, 
  onViewAll 
}: { 
  invitations: Reservation[]; 
  onViewAll: () => void 
}) => {
  if (invitations.length === 0) return null;

  const nextMeeting = invitations[0];
  const formatTime = (iso: string) => iso.split('T')[1].substring(0, 5);
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  const isOngoing = new Date(nextMeeting.startTime) <= new Date() && new Date(nextMeeting.endTime) >= new Date();

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0, y: -20 }}
      animate={{ height: 'auto', opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`${isOngoing ? 'bg-orange-600' : 'bg-blue-600'} text-white overflow-hidden shrink-0 border-b border-black/10 shadow-xl relative z-[60]`}
    >
      <div className="max-w-7xl mx-auto px-8 py-3.5 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-12 h-12 ${isOngoing ? 'bg-orange-400' : 'bg-blue-400'} bg-opacity-30 rounded-full flex items-center justify-center relative`}>
            <div className="absolute inset-0 rounded-full bg-inherit animate-ping opacity-25" />
            <div className="absolute inset-2 rounded-full bg-inherit animate-pulse opacity-40" />
            <AlertCircle className="text-white relative z-10" size={24} />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${isOngoing ? 'bg-white text-orange-600' : 'bg-white text-blue-600'}`}>
                {isOngoing ? "En cours" : "Nouvelle Invitation"}
              </span>
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-tighter">Réunion prévue</span>
            </div>
            <h4 className="text-base font-black truncate leading-tight">
              {nextMeeting.subject}
            </h4>
            <p className="text-xs text-white/80 font-medium truncate italic">
               {nextMeeting.organizerName} vous a invité(e) le {formatDate(nextMeeting.startTime)} à {formatTime(nextMeeting.startTime)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={onViewAll}
            className="px-6 py-2 bg-white text-blue-900 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all shadow-lg active:scale-95"
          >
            Voir mes réunions
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const AdminDashboard = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "employees"), orderBy("lastName", "asc"));
    return onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    });
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "employees"), {
        firstName,
        lastName,
        email,
        position
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPosition("");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "employees");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm("Supprimer cet employé ?")) {
      try {
        await deleteDoc(doc(db, "employees", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `employees/${id}`);
      }
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h2 className="text-2xl font-black text-[#001D40]">Panel de Gestion des Employés</h2>
          <p className="text-slate-500 text-sm">Ajoutez ou supprimez les membres de l'équipe pouvant être invités aux réunions.</p>
        </header>

        {/* Add Employee Form */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus size={18} className="text-blue-500" />
            Nouvel Employé
          </h3>
          <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input 
              required
              placeholder="Prénom"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <input 
              required
              placeholder="Nom"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <input 
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none md:col-span-1"
            />
            <input 
              placeholder="Fonction / Poste"
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button 
              type="submit"
              disabled={loading}
              className="md:col-span-4 bg-[#001D40] text-white py-2 rounded font-bold hover:bg-blue-900 transition-all disabled:bg-slate-300"
            >
              {loading ? "Ajout..." : "Ajouter au répertoire"}
            </button>
          </form>
        </section>

        {/* Employee List */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employé</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fonction</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 italic text-sm">
                    Aucun employé enregistré.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <span className="font-bold text-slate-700">{emp.firstName} {emp.lastName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-500">{emp.email}</td>
                    <td className="p-4 text-sm text-slate-500">
                      {emp.position ? (
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase">{emp.position}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};

const ALL_DAYS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

const getWeekDays = (now: Date) => {
  const start = new Date(now);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(start.setDate(diff));
  
  return Array.from({ length: 14 }, (_, i) => {
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
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'admin'>('all');
  const [now, setNow] = useState(new Date());
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  const weekDays = useMemo(() => getWeekDays(now), [now]);

  const userInvitations = useMemo(() => {
    if (!user || !currentEmployee) return [];
    const fullName = `${currentEmployee.firstName} ${currentEmployee.lastName}`.trim().toLowerCase();
    return reservations
      .filter(r => {
        const isParticipant = r.participants.some(p => p.trim().toLowerCase() === fullName);
        const isFutureOrOngoing = new Date(r.endTime) > now;
        return isParticipant && isFutureOrOngoing;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [reservations, user, currentEmployee, now]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        setIsCheckingRegistration(true);
        console.log("Checking registration for:", u.email);
        // Check by userId first to find existing profiles regardless of email changes
        const qByUid = query(collection(db, "employees"), where("userId", "==", u.uid));
        
        try {
          const { getDocs } = await import('firebase/firestore');
          const snapByUid = await getDocs(qByUid);
          
          if (snapByUid.empty) {
            console.log("No profile found by UID, checking email...");
            // Also check by email for backwards compatibility
            const qByEmail = query(collection(db, "employees"), where("email", "==", u.email));
            const snapByEmail = await getDocs(qByEmail);
            
            if (snapByEmail.empty) {
              console.log("Totally new user. Showing registration modal.");
              setIsRegistrationModalOpen(true);
              setCurrentEmployee(null);
            } else {
              console.log("Found profile by email. Updating UID.");
              const docId = snapByEmail.docs[0].id;
              const data = snapByEmail.docs[0].data();
              await updateDoc(doc(db, "employees", docId), { userId: u.uid });
              setCurrentEmployee({ id: docId, ...data, userId: u.uid } as Employee);
              setIsRegistrationModalOpen(false);
            }
          } else {
            console.log("Profile found by UID.");
            setCurrentEmployee({ id: snapByUid.docs[0].id, ...snapByUid.docs[0].data() } as Employee);
            setIsRegistrationModalOpen(false);
          }
        } catch (err) {
          console.error("Auto-registration check failed:", err);
        } finally {
          setIsCheckingRegistration(false);
        }
      } else {
        setCurrentEmployee(null);
        setIsRegistrationModalOpen(false);
        setIsCheckingRegistration(false);
      }
    });

    return () => {
      clearInterval(timer);
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const qRooms = query(collection(db, "rooms"));
    const unsubscribeRooms = onSnapshot(qRooms, (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(roomList);
      if (roomList.length === 0) {
        const initialRooms = [
          { name: "Salle de réunion", capacity: 12, equipment: ["Vidéoprojecteur", "Tableau Blanc"] },
          { name: "Espace Innovation", capacity: 8, equipment: ["Écran tactile", "Machine à café"] },
          { name: "Boardroom Delta", capacity: 20, equipment: ["Visioconférence", "Micro-pieuvres"] },
          { name: "Focus Room 1", capacity: 2, equipment: ["Réduction sonore"] },
        ];
        initialRooms.forEach(r => addDoc(collection(db, "rooms"), r));
      } else {
        // Migration logic: Rename the room if it's still using the old name
        roomList.forEach(room => {
          if (room.name === "Salle A102 (Vivaldi)") {
            updateDoc(doc(db, "rooms", room.id), { name: "Salle de réunion" });
          }
        });
      }
    }, (err) => {
       console.error("Rooms subscription failed:", err);
    });

    const qReservations = query(collection(db, "reservations"), orderBy("startTime", "asc"));
    const unsubscribeReservations = onSnapshot(qReservations, (snapshot) => {
      setReservations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));
    }, (err) => {
       handleFirestoreError(err, OperationType.GET, "reservations");
    });

    return () => {
      unsubscribeRooms();
      unsubscribeReservations();
    };
  }, [user]);

  const handleDeleteReservation = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette réservation ?")) {
      try {
        await deleteDoc(doc(db, "reservations", id));
      } catch (err: any) {
        console.error("Delete failed:", err);
        alert("Erreur lors de la suppression. Vérifiez vos permissions.");
        handleFirestoreError(err, OperationType.DELETE, `reservations/${id}`);
      }
    }
  };

  const filteredReservations = useMemo(() => {
    if (activeTab === 'mine' && user && currentEmployee) {
      const fullName = `${currentEmployee.firstName} ${currentEmployee.lastName}`.trim().toLowerCase();
      return reservations.filter(r => 
        r.organizerId === user.uid || 
        r.participants.some(p => p.trim().toLowerCase() === fullName)
      );
    }
    return reservations;
  }, [activeTab, reservations, user, currentEmployee]);

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
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        reservations={reservations}
        currentEmployee={currentEmployee}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <InvitationBanner 
          invitations={userInvitations} 
          onViewAll={() => setActiveTab('mine')} 
        />
        {activeTab === 'admin' ? (
          <AdminDashboard />
        ) : (
          <>
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
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
              {/* Main Planning Section - TIMELINE VIEW */}
              <section className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Calendar size={16} className="text-blue-600" />
                    Planning d'Occupation (14 jours)
                  </h3>
                  <div className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded">
                    Du {weekDays[0].toLocaleDateString()} au {weekDays[13].toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex-1 overflow-x-auto custom-scrollbar bg-slate-50/30">
                  <div className="flex h-full min-w-max divide-x divide-slate-100">
                    {weekDays.map((dayDate, idx) => {
                      const dayStr = dayDate.toISOString().split('T')[0];
                      const dayReservations = filteredReservations.filter(r => r.startTime.startsWith(dayStr));
                      const isToday = dayStr === now.toISOString().split('T')[0];
                      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

                      return (
                        <div key={idx} className="flex flex-col w-56 shrink-0">
                          <div className={`h-10 flex flex-col items-center justify-center border-b border-slate-100 font-bold ${isToday ? 'bg-blue-600 text-white' : isWeekend ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                            <div className="text-[11px] leading-none">{ALL_DAYS[dayDate.getDay()]}</div>
                            <div className="text-[13px] leading-none mt-0.5">{dayDate.getDate()} {dayDate.toLocaleDateString('fr-FR', { month: 'short' })}</div>
                            {isToday && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                          </div>
                          
                          <div className={`flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar ${isWeekend ? 'bg-slate-50/50' : 'bg-white'}`}>
                            {dayReservations.length === 0 ? (
                              <div className="h-full flex items-center justify-center">
                                <p className="text-[10px] text-slate-200 font-medium italic">{isWeekend ? 'Fermé' : 'Libre'}</p>
                              </div>
                            ) : (
                              dayReservations.map(res => {
                                const isNow = new Date() >= new Date(res.startTime) && new Date() <= new Date(res.endTime);
                                const formatTime = (iso: string) => iso.split('T')[1].substring(0, 5);
                                const isInvited = currentEmployee && res.participants.some(p => p.trim().toLowerCase() === `${currentEmployee.firstName} ${currentEmployee.lastName}`.trim().toLowerCase());

                                return (
                                  <motion.div 
                                    key={res.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`p-2.5 rounded-lg text-[10px] border-l-4 shadow-sm group relative ${
                                      isNow 
                                        ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200 ring-inset' 
                                        : isInvited
                                          ? 'bg-blue-600 border-white text-white'
                                          : 'bg-blue-50 border-blue-500 hover:bg-blue-100 transition-colors'
                                    }`}
                                  >
                                    {isInvited && !isNow && (
                                       <div className="absolute top-1 left-1.5 flex items-center gap-1">
                                          <Users size={8} className="text-blue-100" />
                                          <span className="text-[7px] font-black uppercase tracking-tighter text-blue-100">Invité(e)</span>
                                       </div>
                                    )}
                                    <p className={`font-bold truncate mb-0.5 uppercase tracking-tighter ${isInvited && !isNow ? 'mt-2 text-white' : 'text-slate-800'}`}>{res.subject}</p>
                                    <div className={`flex items-center gap-1 font-black opacity-80 mb-1 ${isInvited && !isNow ? 'text-blue-100' : 'text-blue-600'}`}>
                                      <Clock size={10} />
                                      {formatTime(res.startTime)} - {formatTime(res.endTime)}
                                    </div>
                                    <p className={`${isInvited && !isNow ? 'text-blue-200' : 'text-slate-500'} italic truncate text-[9px]`}>Par {res.organizerName}</p>
                                    
                                    {user?.uid === res.organizerId || user?.email === "thales.market@gmail.com" ? (
                                      <button 
                                        onClick={() => handleDeleteReservation(res.id)}
                                        className="absolute top-1 right-1 opacity-100 p-1 text-red-400 hover:text-red-500 transition-all bg-white rounded-full shadow-md z-10"
                                      >
                                        <Trash2 size={12} strokeWidth={2.5} />
                                      </button>
                                    ) : null}
                                  </motion.div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      <ReservationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        room={selectedRoom}
        user={user}
      />

      <RegistrationModal 
        isOpen={isRegistrationModalOpen}
        user={user}
        onComplete={(emp) => {
          setCurrentEmployee(emp);
          setIsRegistrationModalOpen(false);
        }}
      />
    </div>
  );
}

