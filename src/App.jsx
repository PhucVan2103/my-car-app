import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Home, History, BarChart3, Settings, X, Fuel, Wrench, Navigation2, 
  Lock, Unlock, CheckCircle2, ChevronRight, Bell, MapPin, ShieldCheck, 
  Calendar, Thermometer, FileText, Droplets, Camera, Sparkles, Package, 
  Hammer, ChevronDown, User, Car, Database, CreditCard, BadgeCheck, 
  Map as MapIcon, Shield, AlertTriangle, LocateFixed, Loader2, Play, Square, Navigation,
  Trash2, Pencil, RotateCw, MoveHorizontal, LogOut
} from 'lucide-react';
import { db, auth, provider } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { signInWithRedirect, onAuthStateChanged, signOut } from "firebase/auth";

// MẢNG ẢNH 360 CỦA BẠN: 75 hình
const CAR_360_IMAGES = Array.from({ length: 75 }, (_, i) => `/car360/${i + 1}.png`);
// Hình nền dự phòng nếu chưa có thư mục local
const FALLBACK_IMAGE = ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1000"];
const DEFAULT_DIESEL_PRICE = 20500; 

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeModule, setActiveModule] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // Quản lý Popup Xóa Hành trình
  const [loadingData, setLoadingData] = useState(true);
  
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // User & Vehicle State
  const [userName, setUserName] = useState('Jane');
  const [userAvatar, setUserAvatar] = useState(null);
  const [vehicleName, setVehicleName] = useState('Porsche Panamera');
  const [plateNumber, setPlateNumber] = useState('51F-123.45');
  const [tankCapacity, setTankCapacity] = useState(70);
  const [currentFuelLiters, setCurrentFuelLiters] = useState(55);

  // Giấy tờ xe
  const [insuranceData, setInsuranceData] = useState({ note: '', image: null, expiryDate: '2026-05-01' });
  const [licenseData, setLicenseData] = useState({ note: 'Hạng B2', image: null });
  const [registrationData, setRegistrationData] = useState({ note: '', image: null });
  const [inspectionData, setInspectionData] = useState({ note: '', image: null, expiryDate: '2026-05-20' });
  const [roadFeeData, setRoadFeeData] = useState({ note: '', image: null, expiryDate: '' });
  const [hullInsuranceData, setHullInsuranceData] = useState({ note: '', image: null, expiryDate: '' });

  const [records, setRecords] = useState([
    { id: 1, type: 'fuel', date: '10/05/2026', cost: 1050000, pricePerLiter: 20500, liters: 51.2, location: 'Petrolimex Q1', odo: 45150 },
    { id: 2, type: 'maintenance', date: '20/04/2026', cost: 1500000, odo: 44000, title: 'Thay nhớt định kỳ' }
  ]);

  const [trips, setTrips] = useState([]);

  // Trạng thái ghi hành trình
  const [isRecordingTrip, setIsRecordingTrip] = useState(false);
  const [ongoingTrip, setOngoingTrip] = useState({
    timer: 0,
    from: '',
    to: '',
    distance: '0',
    startCoords: null,
    isReviewing: false
  });

  // Tích hợp Firestore
  const tripsCollectionRef = useMemo(() => collection(db, "trips"), []);

  const getTrips = async () => {
    setLoadingData(true);
    const q = query(tripsCollectionRef, orderBy("createdAt", "desc"));
    const data = await getDocs(q);
    setTrips(data.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    setLoadingData(false);
  };

  // Lắng nghe trạng thái đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setAuthUser(currentUser);
        setUserName(currentUser.displayName || 'User');
        setUserAvatar(currentUser.photoURL || null);
      } else {
        setAuthUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getTrips();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hiệu ứng timer
  useEffect(() => {
    let interval;
    if (isRecordingTrip && !ongoingTrip.isReviewing) {
      interval = setInterval(() => {
        setOngoingTrip(prev => ({ ...prev, timer: prev.timer + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecordingTrip, ongoingTrip.isReviewing]);

  const fuelPercentage = Math.round((currentFuelLiters / tankCapacity) * 100);

  const reminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const alerts = [];
    const check = (data, name) => {
      if (!data?.expiryDate) return;
      const exp = new Date(data.expiryDate);
      const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
      if (diff < 0) alerts.push({ name, days: Math.abs(diff), status: 'expired' });
      else if (diff <= 30) alerts.push({ name, days: diff, status: 'warning' });
    };
    check(inspectionData, 'Đăng kiểm');
    check(roadFeeData, 'Phí đường bộ');
    check(insuranceData, 'Bảo hiểm TNDS');
    check(hullInsuranceData, 'Bảo hiểm thân vỏ');
    return alerts.sort((a, b) => (a.status === 'expired' ? -1 : 1));
  }, [inspectionData, roadFeeData, insuranceData, hullInsuranceData]);

  const handleAddRecord = (record) => {
    setRecords(prev => [{ ...record, id: Date.now() }, ...prev]);
    if (record.type === 'fuel') {
      setCurrentFuelLiters(prev => Math.min(tankCapacity, prev + record.liters));
    }
    setActiveModule(null);
  };

  const handleSaveTrip = async (tripDataToSave) => {
    await addDoc(tripsCollectionRef, {
      ...tripDataToSave,
      createdAt: serverTimestamp()
    });
    getTrips(); // Tải lại danh sách
    setIsRecordingTrip(false);
    setOngoingTrip({ timer: 0, from: '', to: '', distance: '0', startCoords: null, isReviewing: false });
    setActiveModule(null);
  };

  const handleCancelTrip = () => {
    setIsRecordingTrip(false);
    setOngoingTrip({ timer: 0, from: '', to: '', distance: '0', startCoords: null, isReviewing: false });
    setActiveModule(null);
  };

  const executeDeleteTrip = async (id) => {
    const tripDoc = doc(db, "trips", id);
    await deleteDoc(tripDoc);
    getTrips(); // Tải lại danh sách
    setDeleteConfirm(null);
  };

  const handleUpdateTrip = async (updatedTrip) => {
    const { id, ...dataToUpdate } = updatedTrip;
    const tripDoc = doc(db, "trips", id);
    await updateDoc(tripDoc, dataToUpdate);
    getTrips(); // Tải lại danh sách
    setEditMode(null);
  };

  const handleLogin = async () => {
    try {
      // Sử dụng signInWithRedirect thay cho popup để tương thích tốt hơn với trình duyệt điện thoại
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      alert("Đăng nhập thất bại. Vui lòng thử lại!");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-500"/></div>;
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex justify-center font-sans antialiased text-slate-900">
         <div className="relative w-full max-w-md h-screen bg-white shadow-2xl flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6"><Car size={48} /></div>
            <h1 className="text-3xl font-black text-slate-800 mb-2">My Car App</h1>
            <p className="text-slate-500 font-medium text-center mb-12">Quản lý hành trình và chi phí cho xế yêu của bạn một cách dễ dàng.</p>
            <button onClick={handleLogin} className="w-full bg-slate-900 text-white font-bold py-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">
               <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
               Đăng nhập bằng Google
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans antialiased text-slate-900">
      {/* App Container */}
      <div className="relative w-full max-w-md h-screen bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* App Content Area */}
        <div className="flex-1 relative flex flex-col pt-4 overflow-hidden bg-slate-50/50">
          <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">
            {activeTab === 'dashboard' && (
              <DashboardView 
                userName={userName} fuelPercentage={fuelPercentage} currentFuelLiters={currentFuelLiters} 
                reminders={reminders} onSelectModule={setActiveModule}
                isRecordingTrip={isRecordingTrip} ongoingTimer={ongoingTrip.timer} lastTrip={trips[0]} 
                isReviewing={ongoingTrip.isReviewing}
              />
            )}
            {activeTab === 'trip' && (
              <TripMainView 
                trips={trips} 
                loading={loadingData}
                isRecording={isRecordingTrip} 
                onStartTrip={() => setActiveModule('trip')} 
                onRequestDelete={(trip) => setDeleteConfirm(trip)} // Gọi Popup thay vì xóa luôn
                onEditTrip={(trip) => setEditMode({ type: 'edit_trip', data: trip })}
              />
            )}
            {activeTab === 'expenses' && <CombinedExpensesView records={records} />}
            {activeTab === 'settings' && (
              <SettingsView 
                tankCapacity={tankCapacity} vehicleName={vehicleName} plateNumber={plateNumber} 
                userName={userName} userAvatar={userAvatar} remindersCount={reminders.length} 
                onEdit={setEditMode} 
                onLogout={handleLogout}
              />
            )}
          </div>

          {/* Navigation Bar - FIXED AT BOTTOM */}
          <div className="absolute bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-100 px-8 pt-3 pb-6 flex justify-between items-center z-[90]">
            <NavBtn icon={<Home size={22} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavBtn icon={<Navigation size={22} />} active={activeTab === 'trip'} onClick={() => setActiveTab('trip')} />
            <NavBtn icon={<BarChart3 size={22} />} active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
            <NavBtn 
              icon={<div className="relative"><Settings size={22} />{reminders.length > 0 && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></div>}</div>} 
              active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} 
            />
          </div>
        </div>

        {/* Overlay Modals */}
        {activeModule === 'fuel' && <FuelModule onClose={() => setActiveModule(null)} onSave={handleAddRecord} />}
        {activeModule === 'maintenance' && <ExpenseModule onClose={() => setActiveModule(null)} onSave={handleAddRecord} />}
        {activeModule === 'trip' && (
          <TripModule 
            isRecording={isRecordingTrip} 
            ongoingTrip={ongoingTrip}
            setOngoingTrip={setOngoingTrip}
            onStart={() => setIsRecordingTrip(true)}
            onStop={handleSaveTrip}
            onCancelTrip={handleCancelTrip}
            onClose={() => setActiveModule(null)} 
          />
        )}
        {activeModule === 'notifications' && <NotificationModule reminders={reminders} onClose={() => setActiveModule(null)} />}
        
        {editMode === 'profile' && <ProfileModule currentName={userName} currentAvatar={userAvatar} onClose={() => setEditMode(null)} onSave={(n, a) => { setUserName(n); setUserAvatar(a); setEditMode(null); }} />}
        {editMode === 'vehicle_details' && <VehicleModule vehicleName={vehicleName} plateNumber={plateNumber} insuranceData={insuranceData} licenseData={licenseData} registrationData={registrationData} inspectionData={inspectionData} roadFeeData={roadFeeData} hullInsuranceData={hullInsuranceData} onClose={() => setEditMode(null)} onSave={(d) => { setVehicleName(d.name); setPlateNumber(d.plate); setInsuranceData(d.insurance); setLicenseData(d.license); setRegistrationData(d.registration); setInspectionData(d.inspection); setRoadFeeData(d.roadFee); setHullInsuranceData(d.hullInsurance); setEditMode(null); }} />}
        {editMode === 'capacity' && <EditSettingModule title="Dung tích bình" icon={<Droplets size={24}/>} value={tankCapacity} type="number" suffix="Lít" onClose={() => setEditMode(null)} onSave={(v) => { setTankCapacity(Number(v) || 0); setEditMode(null); }} />}
        {editMode?.type === 'edit_trip' && <EditTripModule trip={editMode.data} onClose={() => setEditMode(null)} onSave={handleUpdateTrip} />}

        {/* Delete Confirmation Modal (Bổ sung mới) */}
        {deleteConfirm && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
             <div className="bg-white rounded-3xl p-6 w-full max-w-[320px] shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                   <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Xóa hành trình?</h3>
                <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">Bạn có chắc chắn muốn xóa hành trình từ <span className="font-bold text-slate-700">{deleteConfirm.from}</span> đến <span className="font-bold text-slate-700">{deleteConfirm.to}</span>? Dữ liệu này sẽ không thể khôi phục.</p>
                <div className="flex gap-3">
                   <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold active:scale-95 transition-all">Hủy bỏ</button>
                   <button onClick={() => executeDeleteTrip(deleteConfirm.id)} className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white font-bold active:scale-95 transition-all shadow-[0_4px_14px_0_rgba(239,68,68,0.39)]">Xóa ngay</button>
                </div>
             </div>
          </div>
        )}

        {/* CSS Animation */}
        <style>{`
          @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
          .animate-marquee { animation: marquee 20s linear infinite; width: max-content; }
          .animate-marquee:hover { animation-play-state: paused; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          .slanted-stripe { background: repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 10px, #f8fafc 10px, #f8fafc 20px); }
          @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
          .recording-pulse { animation: pulse-ring 2s infinite; }
        `}</style>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// DASHBOARD VIEW
// ----------------------------------------------------------------------
function DashboardView({ userName, fuelPercentage, currentFuelLiters, reminders, isRecordingTrip, ongoingTimer, lastTrip, isReviewing, onSelectModule }) {
  const [useFallback, setUseFallback] = useState(false);

  return (
    <div className="px-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mt-4">
        <h2 className="text-2xl font-bold text-slate-800">Chào {userName}!</h2>
        <button onClick={() => onSelectModule('notifications')} className="relative p-3 bg-white border border-slate-100 rounded-2xl text-slate-600 shadow-sm">
          <Bell size={20} />
          {reminders.length > 0 && <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></div>}
        </button>
      </div>

      {reminders.length > 0 && (
        <div className="mx-1 mt-6 overflow-hidden py-1.5 flex items-center cursor-pointer relative z-30" onClick={() => onSelectModule('notifications')}>
          <div className="flex whitespace-nowrap animate-marquee">
            {reminders.slice(0, 10).map((r, i) => (
              <span key={`a-${i}`} className="mx-3 flex items-center gap-1.5 text-[10px] font-bold">
                <span className={r.status === 'expired' ? 'text-red-500' : 'text-slate-700'}>{r.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] ${r.status === 'expired' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{r.status === 'expired' ? 'Quá hạn' : `Còn ${r.days} ngày`}</span>
                <span className="text-slate-300 ml-3">•</span>
              </span>
            ))}
            {reminders.slice(0, 10).map((r, i) => (
              <span key={`b-${i}`} className="mx-3 flex items-center gap-1.5 text-[10px] font-bold">
                <span className={r.status === 'expired' ? 'text-red-500' : 'text-slate-700'}>{r.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] ${r.status === 'expired' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{r.status === 'expired' ? 'Quá hạn' : `Còn ${r.days} ngày`}</span>
                <span className="text-slate-300 ml-3">•</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 360 VIEWER */}
      <Car360Viewer images={useFallback ? FALLBACK_IMAGE : CAR_360_IMAGES} onError={() => setUseFallback(true)} />

      <div className="mt-12 bg-slate-900 rounded-[24px] p-4 text-white flex justify-between items-center shadow-lg relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-blue-400"><Droplets size={20} fill="currentColor" /></div>
          <div><p className="text-[10px] font-medium opacity-60">Nhiên liệu</p><p className="text-base font-bold">{fuelPercentage}% • {currentFuelLiters.toFixed(1)}L</p></div>
        </div>
        <div className="text-right"><p className="text-xl font-bold">640<span className="text-[10px] ml-1 opacity-60">km</span></p><p className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter">Dự kiến đi được</p></div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <GridItem icon={<Fuel size={20} />} label="Diesel Log" val={`${currentFuelLiters.toFixed(0)}L`} desc="Cập nhật chi phí & vị trí" color="bg-blue-50 text-blue-500" onClick={() => onSelectModule('fuel')} />
        <GridItem icon={<Wrench size={20} />} label="Service" val="2318 km" desc="Bảo dưỡng định kỳ" color="bg-amber-50 text-amber-500" onClick={() => onSelectModule('maintenance')} />
        <button onClick={() => onSelectModule('trip')} className={`col-span-2 bg-white rounded-[24px] p-4 border border-slate-50 shadow-sm relative overflow-hidden h-32 flex flex-col justify-between text-left active:scale-[0.98] transition-all`}>
           <div className="flex justify-between items-start relative z-10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRecordingTrip ? (isReviewing ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500') : 'bg-blue-50 text-blue-500'}`}>
                {isRecordingTrip ? (isReviewing ? <CheckCircle2 size={18} /> : <Navigation size={18} className="animate-bounce" />) : <MapPin size={18} />}
              </div>
              <span className={`text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${isRecordingTrip ? (isReviewing ? 'bg-amber-500' : 'bg-red-500 recording-pulse') : 'bg-slate-400'}`}>
                {isRecordingTrip ? (isReviewing ? 'Chờ xác nhận' : 'Đang ghi hành trình') : 'Sẵn sàng ghi'}
              </span>
           </div>
           <div className="relative z-10">
              <p className="font-bold text-slate-800 text-sm">Nhật ký di chuyển</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                {isRecordingTrip ? (isReviewing ? <span className="text-amber-600 font-bold">Chuyến đi đã dừng, chờ lưu...</span> : <span className="text-red-500 font-bold">Đang di chuyển: {formatTime(ongoingTimer)}</span>) : (lastTrip ? `${lastTrip.distance} km • ${lastTrip.from} ➔ ${lastTrip.to}` : 'Chưa có hành trình nào')}
              </p>
           </div>
           <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 400 200">
             <path d="M0,150 Q100,150 150,100 T300,80" fill="none" stroke={isRecordingTrip ? (isReviewing ? "#f59e0b" : "#ef4444") : "#3b82f6"} strokeWidth="10" />
           </svg>
        </button>
      </div>
    </div>
  );
}

function Car360Viewer({ images, onError }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  useEffect(() => {
    images.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  const handleStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches ? e.touches[0].clientX : e.clientX);
  };

  const handleMove = (e) => {
    if (!isDragging || images.length === 0) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = currentX - startX;

    if (Math.abs(delta) > 15) {
      setCurrentIndex((prevIndex) => {
        let nextIndex = prevIndex - (delta > 0 ? 1 : -1);
        if (nextIndex < 0) return images.length - 1;
        if (nextIndex >= images.length) return 0;
        return nextIndex;
      });
      setStartX(currentX);
    }
  };

  const handleEnd = () => setIsDragging(false);

  return (
    <div 
      className="relative mt-10 mb-6 h-64 w-full flex items-center justify-center cursor-ew-resize group select-none touch-pan-y"
      onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
      onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
    >
      <div className="absolute inset-0 slanted-stripe -z-10 rounded-3xl opacity-50"></div>
      {images.length > 1 && (
        <>
          <div className="absolute top-3 right-3 bg-slate-900/40 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 opacity-60 transition-opacity z-10 shadow-sm pointer-events-none">
            <RotateCw size={12} className={isDragging ? "animate-spin" : ""} /> 360°
          </div>
          <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-slate-400 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full pointer-events-none transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
            <MoveHorizontal size={14} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Vuốt để xoay</span>
          </div>
        </>
      )}
      {images.length > 0 && <img src={images[currentIndex]} alt="Xe 360" onError={onError} className="w-full h-full object-cover drop-shadow-2xl pointer-events-none transition-transform duration-75 scale-[1.25]" draggable="false" />}
    </div>
  );
}

function GridItem({ icon, label, val, desc, color, onClick }) {
  return (
    <button onClick={onClick} className="bg-white p-5 rounded-[24px] border border-slate-50 shadow-sm text-left active:scale-95 transition-all flex flex-col justify-between h-32">
      <div className="flex justify-between items-start"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div><span className="text-[10px] font-bold text-slate-400">{val}</span></div>
      <div><p className="font-bold text-slate-800 text-sm leading-tight">{label}</p><p className="text-[9px] text-slate-400 mt-0.5 truncate">{desc}</p></div>
    </button>
  );
}

function NavBtn({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`relative p-2.5 transition-all ${active ? 'text-blue-500' : 'text-slate-300'}`}>
      {React.cloneElement(icon, { strokeWidth: active ? 2.5 : 2 })}
      {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
    </button>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
}

// ----------------------------------------------------------------------
// TRIP MAIN VIEW
// ----------------------------------------------------------------------
function TripMainView({ trips, isRecording, onStartTrip, onRequestDelete, onEditTrip, loading }) {
  const totalDistance = trips.reduce((acc, curr) => acc + (Number(curr.distance) || 0), 0).toFixed(1);

  return (
    <div className="p-6 pt-6 animate-in slide-in-from-right-10 duration-500 h-full flex flex-col bg-slate-50/50">
       <div className="mb-6">
         <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Hành trình</h2>
         <p className="text-slate-400 text-sm font-medium mt-1">Tổng cộng {totalDistance} km đã ghi</p>
       </div>

       <button 
         onClick={onStartTrip}
         className={`w-full ${isRecording ? 'bg-amber-500' : 'bg-[#1a56ff]'} text-white rounded-3xl p-4 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_8px_30px_rgb(26,86,255,0.3)] mb-8`}
       >
          {isRecording ? <Navigation size={22} className="animate-bounce" /> : <Play size={22} fill="currentColor" />}
          <span className="font-bold text-sm tracking-wide uppercase">
            {isRecording ? 'Đang ghi lộ trình...' : 'Bắt đầu ghi lộ trình mới'}
          </span>
       </button>

       {/* XÓA BỎ DÒNG: <div className="absolute left-[38px] top-4 bottom-0 w-[2px] bg-slate-100 z-0"></div> KHỎI ĐÂY */}
       <div className="flex-1 overflow-y-auto scrollbar-hide -mx-6 px-6 relative">
          {/* Cấp phát khoảng trống bên trái (pl-10) để vẽ Timeline */}
          <div className="space-y-6 pb-8 relative z-10 pl-10">
            {loading ? (
              <div className="text-center py-10 text-slate-400">
                 <Loader2 size={32} className="mx-auto mb-3 opacity-50 animate-spin" />
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                 <MapIcon size={32} className="mx-auto mb-3 opacity-20" />
                 <p className="font-bold text-sm">Chưa có dữ liệu</p>
              </div>
            ) : (
              trips.map((t, index) => (
                <div key={t.id} className="relative group">
                  {/* ĐƯỜNG KẺ NỐI GIỮA CÁC ĐIỂM (Line-per-item) */}
                  {/* Chỉ vẽ đường kẻ nếu đây không phải là phần tử cuối cùng */}
                  {index !== trips.length - 1 && (
                     <div className="absolute left-[-27px] top-8 bottom-[-24px] w-[2px] bg-slate-200 z-0"></div>
                  )}

                  {/* DẤU CHẤM TRÒN LỚN (Mốc thời gian bên ngoài) */}
                  {/* left-[-32px] để lùi ra ngoài, top-[14px] canh vừa vặn ngang dòng ngày tháng */}
                  <div className="absolute left-[-32px] top-[14px] w-3 h-3 bg-blue-500 rounded-full ring-[4px] ring-slate-100/50 shadow-sm z-10 box-content"></div>
                  
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                    {/* Header: Date and Actions */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[12px] font-bold text-slate-400">{t.date} • {t.time}</p>
                        <div className="inline-block mt-2 px-3 py-1.5 bg-[#f0f4ff] rounded-full">
                          <p className="text-[13px] font-black text-blue-600 leading-none">{t.distance} km</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 border border-slate-100 rounded-2xl p-1 bg-slate-50/50">
                        <button onClick={() => onEditTrip(t)} className="p-2 text-slate-400 hover:text-blue-500 rounded-xl transition-colors"><Pencil size={16}/></button>
                        <div className="w-px h-5 bg-slate-200"></div>
                        {/* Gọi hàm onRequestDelete lên App để hiển thị Modal */}
                        <button onClick={() => onRequestDelete(t)} className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </div>

                    {/* Content: Locations and Duration */}
                    <div className="flex justify-between items-end">
                       <div className="flex flex-1 relative">
                          {/* TRỤC TỌA ĐỘ BÊN TRONG THẺ (Dấu chấm -> Line đứt -> Điểm đến) */}
                          <div className="flex flex-col items-center mr-3 mt-1.5 w-3 shrink-0">
                             {/* Chấm xám nhạt ở trên */}
                             <div className="w-2 h-2 bg-slate-300 rounded-full shrink-0"></div>
                             {/* Đường nét đứt (Dashed line) */}
                             <div className="w-[1.5px] h-[18px] bg-transparent border-l-[1.5px] border-dashed border-slate-300 my-1"></div>
                             {/* Icon Location (viền xanh lõm trắng) */}
                             <div className="w-3 h-3 border-[2.5px] border-blue-500 rounded-full bg-white shrink-0"></div>
                          </div>
                          {/* Addresses */}
                          <div className="space-y-[11px] flex-1">
                             <p className="text-[15px] font-bold text-[#2d3748] line-clamp-1 leading-none">{t.from}</p>
                             <p className="text-[15px] font-bold text-[#2d3748] line-clamp-1 leading-none">{t.to}</p>
                          </div>
                       </div>
                       
                       <div className="text-right shrink-0 ml-4">
                         <p className="text-[11px] font-bold text-slate-400 mb-0.5">Thời gian</p>
                         <p className="text-xl font-black text-[#1a202c] leading-none">{t.duration || '45 phút'}</p>
                       </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
       </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// COMBINED EXPENSES VIEW
// ----------------------------------------------------------------------
function CombinedExpensesView({ records }) {
  const [viewMode, setViewMode] = useState('list');

  return (
    <div className="p-6 pt-6 animate-in slide-in-from-right-10 duration-500 h-full flex flex-col">
       <div className="mb-6 flex justify-between items-end shrink-0">
         <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Tài chính</p>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Chi phí</h2>
         </div>
       </div>

       <div className="bg-slate-100 p-1 rounded-2xl flex mb-6 shrink-0 border border-slate-200/50">
          <button onClick={() => setViewMode('list')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Danh sách</button>
          <button onClick={() => setViewMode('chart')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${viewMode === 'chart' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Thống kê</button>
       </div>

       <div className="flex-1 overflow-y-auto scrollbar-hide -mx-6 px-6">
          {viewMode === 'list' ? <ExpensesListView records={records} /> : <ExpensesChartView records={records} />}
       </div>
    </div>
  );
}

function ExpensesListView({ records }) {
  const getCategoryConfig = (type) => {
    switch(type) {
      case 'fuel': return { icon: <Droplets size={20}/>, bg: 'bg-blue-50 text-blue-500', label: 'Nhiên liệu' };
      case 'maintenance': return { icon: <Wrench size={20}/>, bg: 'bg-amber-50 text-amber-500', label: 'Bảo dưỡng' };
      case 'repair': return { icon: <Hammer size={20}/>, bg: 'bg-red-50 text-red-500', label: 'Sửa chữa' };
      case 'wash': return { icon: <Sparkles size={20}/>, bg: 'bg-cyan-50 text-cyan-500', label: 'Rửa xe' };
      case 'accessory': return { icon: <Package size={20}/>, bg: 'bg-purple-50 text-purple-500', label: 'Phụ kiện' };
      default: return { icon: <FileText size={20}/>, bg: 'bg-slate-50 text-slate-500', label: 'Khác' };
    }
  };

  const totals = records.reduce((acc, curr) => { acc[curr.type] = (acc[curr.type] || 0) + curr.cost; return acc; }, {});
  const summaryCategories = ['fuel', 'maintenance', 'repair', 'wash', 'accessory'];

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-6">
        {summaryCategories.map(type => {
          const config = getCategoryConfig(type);
          const totalAmount = totals[type] || 0;
          return (
            <div key={type} className="min-w-[130px] bg-white border border-slate-50 rounded-3xl p-4 shadow-sm flex flex-col gap-3 shrink-0">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${config.bg}`}>{config.icon}</div>
              <div className="mt-1">
                <p className="text-[11px] font-bold text-slate-400 mb-0.5">{config.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className="font-black text-slate-800 text-lg">{totalAmount > 0 ? new Intl.NumberFormat('vi-VN').format(totalAmount / 1000) : '0'}</p>
                  <span className="text-[9px] font-bold text-slate-400">{totalAmount > 0 ? 'K' : 'VNĐ'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Lịch sử chi tiết</p>
      
      <div className="space-y-3 pb-8">
        {records.length === 0 ? <p className="text-center text-slate-400 text-sm py-4">Chưa có chi phí nào</p> : null}
        {records.map(r => {
          const conf = getCategoryConfig(r.type);
          return (
            <div key={r.id} className="bg-white border border-slate-50 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${conf.bg}`}>{conf.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{r.type === 'fuel' ? `Đổ dầu (+${r.liters?.toFixed(1)}L)` : r.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                     <span className="text-[9px] font-bold text-slate-400 uppercase">{r.date}</span>
                     {r.location && <><div className="w-0.5 h-0.5 bg-slate-300 rounded-full"></div><span className="text-[9px] font-bold text-blue-500 truncate max-w-[120px]">{r.location}</span></>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-slate-900 text-sm">{new Intl.NumberFormat('vi-VN').format(r.cost)}</p>
                  <p className="text-[9px] font-bold text-slate-400">VNĐ</p>
                </div>
              </div>
              {r.image && <div className="w-full h-32 rounded-xl overflow-hidden mt-1 border border-slate-50"><img src={r.image} alt="Attachment" className="w-full h-full object-cover" /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExpensesChartView({ records }) {
  const currentMonth = useMemo(() => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; }, []);
  const availableMonths = useMemo(() => {
    const months = new Set([currentMonth]);
    records.forEach(r => { const parts = r.date.split('/'); if(parts.length === 3) months.add(parts[1] + '/' + parts[2]); });
    return Array.from(months).sort((a, b) => { const [mA, yA] = a.split('/'); const [mB, yB] = b.split('/'); return new Date(yB, mB - 1) - new Date(yA, mA - 1); });
  }, [records, currentMonth]);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const { categoryData, totalMonth, topCategory } = useMemo(() => {
     const data = { fuel: 0, maintenance: 0, repair: 0, wash: 0, accessory: 0 };
     let total = 0;
     records.forEach(r => {
        const parts = r.date.split('/');
        if(parts.length === 3 && parts[1] + '/' + parts[2] === selectedMonth && data[r.type] !== undefined) {
           data[r.type] += r.cost;
           total += r.cost;
        }
     });
     let topCat = null; let maxVal = -1;
     Object.entries(data).forEach(([key, val]) => { if (val > maxVal && val > 0) { maxVal = val; topCat = key; } });
     return { categoryData: data, totalMonth: total, topCategory: topCat };
  }, [records, selectedMonth]);

  const categories = [
    { id: 'fuel', label: 'Nhiên liệu', color: 'bg-blue-500' }, { id: 'maintenance', label: 'Bảo dưỡng', color: 'bg-amber-500' },
    { id: 'repair', label: 'Sửa chữa', color: 'bg-red-500' }, { id: 'wash', label: 'Rửa xe', color: 'bg-cyan-500' },
    { id: 'accessory', label: 'Phụ kiện', color: 'bg-purple-500' }
  ];
  const topCatLabel = categories.find(c => c.id === topCategory)?.label || 'Chưa có';
  const maxCategoryValue = Math.max(...Object.values(categoryData), 1); 

  const formatCurrencyShort = (value) => {
      if (value === 0) return '0';
      if (value >= 1000000) return (value / 1000000).toLocaleString('vi-VN', {maximumFractionDigits: 1}) + 'Tr';
      return (value / 1000).toLocaleString('vi-VN') + 'K';
  };

  return (
    <div className="animate-in fade-in duration-300 pb-8">
      <div className="mb-6">
        <div className="relative inline-block w-auto bg-white rounded-xl shadow-sm border border-slate-50">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800 pointer-events-none z-10"><Calendar size={18} strokeWidth={2.5} /></div>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="appearance-none w-full bg-transparent text-slate-800 text-[16px] font-black py-2 pl-10 pr-10 outline-none cursor-pointer relative z-0">
            {availableMonths.map(m => <option key={m} value={m} className="font-medium text-base">Tháng {m}</option>)}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-800 pointer-events-none z-10"><ChevronDown size={18} strokeWidth={2.5} /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-slate-50 rounded-3xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng chi ({selectedMonth})</p>
          <p className="text-[18px] font-black text-slate-800 truncate">{new Intl.NumberFormat('vi-VN').format(totalMonth)}<span className="text-[10px] font-bold text-slate-400 ml-1">đ</span></p>
        </div>
        <div className="bg-white border border-slate-50 rounded-3xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chi nhiều nhất</p>
          <p className="text-[18px] font-black text-red-500 truncate">{topCatLabel}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-50 rounded-[32px] p-6 shadow-sm">
         <h3 className="text-[13px] font-bold text-slate-800 mb-6">Biểu đồ hạng mục</h3>
         <div className="h-[220px] flex items-end justify-between gap-1 border-b border-slate-100 pb-2 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-2">
               <div className="border-t border-slate-50 w-full h-0"></div><div className="border-t border-slate-50 w-full h-0"></div>
               <div className="border-t border-slate-50 w-full h-0"></div><div className="border-t border-slate-50 w-full h-0"></div>
            </div>
            {totalMonth === 0 ? <div className="w-full text-center text-sm text-slate-400 pb-10">Không có phát sinh</div> : categories.map(cat => {
              const value = categoryData[cat.id];
              const heightPercent = value > 0 ? Math.max((value / maxCategoryValue) * 100, 5) : 0;
              return (
                <div key={cat.id} className="flex-1 flex flex-col items-center gap-1.5 relative group h-full justify-end z-10">
                  <span className={`text-[10px] font-bold transition-all ${value > 0 ? 'text-slate-600' : 'text-transparent'}`}>{formatCurrencyShort(value)}</span>
                  <div className={`w-full max-w-[32px] rounded-t-lg transition-all duration-700 ${value > 0 ? cat.color : 'bg-slate-100'}`} style={{ height: `${value > 0 ? heightPercent : 2}%` }}>
                     {value > 0 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">{new Intl.NumberFormat('vi-VN').format(value)} đ</div>}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 mt-2 text-center leading-tight line-clamp-2 px-1">{cat.label}</span>
                </div>
              );
            })}
         </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SETTINGS VIEW
// ----------------------------------------------------------------------
function SettingsView({ tankCapacity, vehicleName, plateNumber, userName, userAvatar, remindersCount, onEdit, onLogout }) {
  return (
    <div className="p-6 pt-6 animate-in slide-in-from-right-10 duration-500 h-full">
      <div className="mb-6">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Preferences</p>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Cài đặt</h2>
      </div>

      <div onClick={() => onEdit('profile')} className="bg-white rounded-[28px] p-4 shadow-sm border border-slate-50 flex items-center gap-4 mb-6 cursor-pointer hover:bg-slate-50/50 active:scale-[0.98] transition-all group">
         <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
            {userAvatar ? <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={24} />}
         </div>
         <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg">{userName}</h3>
            <div className="flex items-center gap-1.5 mt-0.5" onClick={(e) => { e.stopPropagation(); onEdit('vehicle_details'); }}>
               <Car size={12} className="text-slate-400" />
               <p className="text-[11px] font-bold text-slate-500">{vehicleName} • <span className="text-slate-400">{plateNumber}</span></p>
            </div>
         </div>
         <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-400 shrink-0" />
      </div>

      <div className="space-y-6 pb-8">
         <SettingsGroup title="Cấu hình xe">
            <button onClick={() => onEdit('vehicle_details')} className="w-full flex items-center justify-between p-4 px-5 border-b border-slate-50 active:bg-slate-50 transition-colors text-left">
               <div className="flex items-center gap-4">
                  <div className="text-slate-500 bg-slate-50 p-2.5 rounded-xl relative">
                     <Car size={20}/>
                     {remindersCount > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></div>}
                  </div>
                  <div><span className="font-bold text-[14px] text-slate-800 block leading-tight">Thông tin xe & Giấy tờ</span><span className="font-medium text-[11px] text-slate-400 mt-0.5 block">Bảo hiểm, đăng kiểm...</span></div>
               </div>
               <ChevronRight size={18} className="text-slate-300" />
            </button>
            <SettingsItem icon={<Droplets size={20}/>} label="Dung tích bình nhiên liệu" value={`${tankCapacity}L`} color="text-blue-500" onClick={() => onEdit('capacity')} />
         </SettingsGroup>

         <SettingsGroup title="Ứng dụng">
            <SettingsItem icon={<Bell size={20}/>} label="Thông báo nhắc nhở" hasToggle={true} defaultChecked={true} color="text-amber-500" />
            <SettingsItem icon={<Thermometer size={20}/>} label="Đơn vị nhiệt độ" value="°C" color="text-cyan-500" />
            <SettingsItem icon={<Database size={20}/>} label="Sao lưu & Phục hồi" color="text-indigo-500" />
         </SettingsGroup>
      </div>

      <div className="pt-2 pb-8">
         <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 border border-red-100 text-red-600 font-bold rounded-2xl active:scale-95 transition-all">
            <LogOut size={20} /> Đăng xuất
         </button>
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <div>
       <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-4">{title}</p>
       <div className="bg-white rounded-[28px] border border-slate-50 shadow-sm overflow-hidden">{children}</div>
    </div>
  );
}

function SettingsItem({ icon, label, value, hasToggle, defaultChecked, color = "text-slate-500", hideArrow = false, onClick }) {
   const [checked, setChecked] = useState(defaultChecked);
   return (
      <button onClick={onClick} className="w-full flex items-center justify-between p-4 px-5 border-b border-slate-50 last:border-0 active:bg-slate-50 transition-colors">
         <div className="flex items-center gap-4">
            <div className={`${color} bg-slate-50 p-2.5 rounded-xl`}>{icon}</div>
            <span className={`font-bold text-[14px] ${color === 'text-red-500' ? 'text-red-600' : 'text-slate-700'}`}>{label}</span>
         </div>
         <div className="flex items-center gap-3">
            {value && <span className="text-[12px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">{value}</span>}
            {hasToggle && (
               <div onClick={(e) => { e.stopPropagation(); setChecked(!checked); }} className={`relative w-11 h-6 rounded-full p-1 transition-colors duration-300 ${checked ? 'bg-blue-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
               </div>
            )}
            {!hasToggle && !hideArrow && <ChevronRight size={18} className="text-slate-300" />}
         </div>
      </button>
   );
}

// ----------------------------------------------------------------------
// MODALS
// ----------------------------------------------------------------------
function TripModule({ isRecording, ongoingTrip, setOngoingTrip, onStart, onStop, onCancelTrip, onClose }) {
  const [isLocating, setIsLocating] = useState(false);

  const fetchLocation = async (type) => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị");
      setIsLocating(false);
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=vi`);
            const data = await res.json();
            const address = data?.address ? [data.address.road || data.address.suburb, data.address.city || data.address.state].filter(Boolean).join(', ') : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            
            if (type === 'start') {
              setOngoingTrip(p => ({ ...p, from: address, startCoords: { lat: latitude, lon: longitude } }));
            } else if (type === 'end') {
              let dist = '0';
              if (ongoingTrip.startCoords) {
                dist = calculateDistance(ongoingTrip.startCoords.lat, ongoingTrip.startCoords.lon, latitude, longitude);
              }
              setOngoingTrip(p => ({ ...p, to: address, distance: dist }));
            }
            resolve(true);
          } catch { resolve(false); } finally { setIsLocating(false); }
        },
        () => { setIsLocating(false); alert("Hãy cấp quyền truy cập Vị trí cho trình duyệt."); resolve(false); },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  };

  const handleStartTracking = async () => {
    const success = await fetchLocation('start');
    if (success) {
      onStart();
      onClose(); // Thu nhỏ xuống tab dashboard
    }
  };

  const handleStopTracking = async () => {
    await fetchLocation('end');
    setOngoingTrip(p => ({ ...p, isReviewing: true }));
  };

  const finalizeSave = () => {
    const d = new Date();
    onStop({
      from: ongoingTrip.from || 'Không rõ điểm đi',
      to: ongoingTrip.to || 'Không rõ điểm đến',
      distance: Number(ongoingTrip.distance) || 0,
      duration: formatTime(ongoingTrip.timer),
      date: d.toLocaleDateString('vi-VN'),
      time: d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}),
    });
  };

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
      <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${ongoingTrip.isReviewing ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}><Navigation2 size={24}/></div>
            <h2 className="text-xl font-bold text-slate-800">{ongoingTrip.isReviewing ? 'Lưu hành trình' : 'Ghi hành trình'}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button>
        </div>

        {isLocating ? (
          <div className="py-12 flex flex-col items-center justify-center text-blue-500 space-y-4">
            <Loader2 size={40} className="animate-spin" />
            <p className="text-sm font-bold animate-pulse">Đang kết nối GPS...</p>
          </div>
        ) : (
          isRecording ? (
            !ongoingTrip.isReviewing ? (
              <div className="space-y-6 text-center py-6">
                 <div className="w-32 h-32 rounded-full border-8 border-blue-50 flex items-center justify-center mx-auto relative recording-pulse">
                   <p className="text-4xl font-black text-blue-600 font-mono">{formatTime(ongoingTrip.timer)}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Điểm xuất phát</p>
                    <p className="text-sm font-bold text-slate-800">{ongoingTrip.from}</p>
                 </div>
                 <button onClick={handleStopTracking} className="w-full bg-red-50 text-red-600 font-bold py-5 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 border border-red-100">
                   <Square fill="currentColor" size={20} /> KẾT THÚC HÀNH TRÌNH
                 </button>
              </div>
            ) : (
              <div className="space-y-4">
                 <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3 text-amber-700">
                    <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-medium leading-relaxed">Hãy kiểm tra lại thông tin. GPS đôi khi sai số, bạn có thể chỉnh sửa quãng đường thủ công.</p>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Điểm đi</label>
                   <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={ongoingTrip.from} onChange={e => setOngoingTrip(p => ({...p, from: e.target.value}))} />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Điểm đến</label>
                   <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={ongoingTrip.to} onChange={e => setOngoingTrip(p => ({...p, to: e.target.value}))} />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quãng đường (KM)</label>
                   <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={ongoingTrip.distance} onChange={e => setOngoingTrip(p => ({...p, distance: e.target.value}))} />
                 </div>
                 <div className="flex gap-3 mt-4">
                   <button onClick={onCancelTrip} className="w-[100px] bg-red-50 text-red-600 font-bold py-5 rounded-3xl active:scale-95 transition-all flex items-center justify-center shrink-0 border border-red-100">HỦY</button>
                   <button onClick={finalizeSave} className="flex-1 bg-blue-600 text-white font-bold py-5 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><CheckCircle2 size={20} /> LƯU HÀNH TRÌNH</button>
                 </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
               <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
                  <MapPin size={32} className="mx-auto text-blue-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">Sẵn sàng ghi lộ trình</p>
                  <p className="text-xs text-slate-500 mt-1">App sẽ lấy GPS lúc bắt đầu và kết thúc để tự tính quãng đường di chuyển.</p>
               </div>
               <button onClick={handleStartTracking} className="w-full bg-blue-600 text-white font-bold py-5 rounded-3xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4">
                 <Play fill="currentColor" size={20} /> BẮT ĐẦU ĐI
               </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function EditTripModule({ trip, onClose, onSave }) {
  const [from, setFrom] = useState(trip.from);
  const [to, setTo] = useState(trip.to);
  const [distance, setDistance] = useState(trip.distance);
  const [duration, setDuration] = useState(trip.duration);

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
      <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-50 rounded-2xl text-slate-600"><Pencil size={24}/></div>
            <h2 className="text-xl font-bold text-slate-800">Sửa Hành Trình</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Điểm đi</label><input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Điểm đến</label><input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none" value={to} onChange={e => setTo(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Quãng đường (km)</label><input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none" value={distance} onChange={e => setDistance(e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Thời gian</label><input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none" value={duration} onChange={e => setDuration(e.target.value)} /></div>
          </div>
          <button onClick={() => onSave({ ...trip, from, to, distance: Number(distance), duration })} className="w-full bg-slate-900 text-white font-bold py-5 rounded-3xl mt-4">LƯU THAY ĐỔI</button>
        </div>
      </div>
    </div>
  );
}

function FuelModule({ onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState(DEFAULT_DIESEL_PRICE);
  const [location, setLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const calculatedLiters = useMemo(() => {
    if (!amount || !pricePerLiter || isNaN(amount) || isNaN(pricePerLiter)) return 0;
    return Number(amount) / Number(pricePerLiter);
  }, [amount, pricePerLiter]);

  const handleGetLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      setLocation('Petrolimex Q1 (Demo)');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=vi`);
          const data = await res.json();
          if (data && data.address) {
            const road = data.address.road || data.address.suburb || '';
            const city = data.address.city || data.address.state || '';
            setLocation([road, city].filter(Boolean).join(', '));
          } else {
            setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch { setLocation('Petrolimex (Demo)'); } finally { setIsLocating(false); }
      },
      () => { setIsLocating(false); setLocation("Petrolimex Q1"); },
      { timeout: 5000 }
    );
  };

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
      <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4"><div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><Droplets size={24}/></div><h2 className="text-xl font-bold text-slate-800">Cập nhật đổ dầu</h2></div>
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tổng chi phí (VNĐ)</label><input type="number" placeholder="0" autoFocus className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all" value={amount} onChange={e => setAmount(e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Giá 1 lít</label><input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-lg font-bold text-slate-800 outline-none" value={pricePerLiter} onChange={e => setPricePerLiter(e.target.value)}/></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Số lít dự kiến</label><div className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-lg font-black text-blue-600 flex items-center justify-center">{calculatedLiters.toFixed(2)} L</div></div>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vị trí / Cây xăng</label><div className="relative"><MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Nhập địa điểm..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 pr-12 text-sm font-bold text-slate-800 outline-none focus:bg-white transition-all" value={location} onChange={e => setLocation(e.target.value)}/><button onClick={handleGetLocation} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500">{isLocating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}</button></div></div>
          <button onClick={() => { if(!amount) return; onSave({ type: 'fuel', cost: Number(amount), pricePerLiter: Number(pricePerLiter), liters: calculatedLiters, location: location || 'N/A', odo: 45200, date: new Date().toLocaleDateString('vi-VN') }); }} className="w-full bg-slate-900 text-white font-bold py-5 rounded-3xl mt-4">LƯU NHẬT KÝ</button>
        </div>
      </div>
    </div>
  );
}

function ExpenseModule({ onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [expenseType, setExpenseType] = useState('maintenance');
  const [image, setImage] = useState(null);
  const fileInputRef = useRef(null);

  const categories = [
    { id: 'maintenance', label: 'Bảo dưỡng', icon: <Wrench size={16}/>, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { id: 'repair', label: 'Sửa chữa', icon: <Hammer size={16}/>, color: 'bg-red-50 text-red-600 border-red-100' },
    { id: 'wash', label: 'Rửa xe', icon: <Sparkles size={16}/>, color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
    { id: 'accessory', label: 'Phụ kiện', icon: <Package size={16}/>, color: 'bg-purple-50 text-purple-600 border-purple-100' }
  ];

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
      <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500 max-h-[85vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-4"><div className="p-3 bg-amber-50 rounded-2xl text-amber-500"><Wrench size={24}/></div><h2 className="text-xl font-bold text-slate-800">Dịch vụ & Chi phí</h2></div><button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button></div>
        <div className="space-y-5">
          <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Loại chi phí</label><div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">{categories.map(c => <button key={c.id} onClick={() => setExpenseType(c.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border whitespace-nowrap transition-all ${expenseType === c.id ? c.color + ' border-transparent shadow-sm' : 'bg-white border-slate-100 text-slate-500'}`}>{c.icon}<span className="text-sm font-bold">{c.label}</span></button>)}</div></div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Số tiền (VNĐ)</label><input type="number" placeholder="0" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-2xl font-black outline-none focus:bg-white transition-all" value={amount} onChange={e => setAmount(e.target.value)}/></div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nội dung chi tiết</label><input type="text" placeholder="Ví dụ: Thay bình ắc quy..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={note} onChange={e => setNote(e.target.value)}/></div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Hình ảnh</label><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setImage(reader.result); reader.readAsDataURL(file); } }} />{image ? <div className="relative w-full h-32 rounded-2xl overflow-hidden"><img src={image} className="w-full h-full object-cover" /><button onClick={() => setImage(null)} className="absolute top-3 right-3 bg-black/60 text-white p-1 rounded-full"><X size={16}/></button></div> : <button onClick={() => fileInputRef.current.click()} className="w-full h-20 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400"><Camera size={20} /><span className="text-[12px] font-bold">Chạm để tải ảnh</span></button>}</div>
          <button onClick={() => { if(!amount) return; const catLabel = categories.find(c => c.id === expenseType)?.label || 'Bảo dưỡng'; onSave({ type: expenseType, cost: Number(amount), title: note || catLabel, odo: 45200, date: new Date().toLocaleDateString('vi-VN'), image: image }); }} className="w-full bg-slate-900 text-white font-bold py-5 rounded-3xl mt-4">LƯU CHI PHÍ</button>
        </div>
      </div>
    </div>
  );
}

function NotificationModule({ reminders, onClose }) { 
  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
       <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500 max-h-[80vh] overflow-y-auto scrollbar-hide flex flex-col">
         <div className="flex justify-between items-center mb-8 shrink-0"><div className="flex items-center gap-4"><div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><Bell size={24}/></div><h2 className="text-xl font-bold text-slate-800">Thông báo</h2></div><button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button></div>
         <div className="space-y-4">
           {reminders.length === 0 ? (
             <div className="text-center py-12 text-slate-400 font-bold">Không có thông báo mới.</div>
           ) : (
             reminders.map((r, i) => (
               <div key={i} className={`p-5 rounded-3xl flex items-start gap-4 border shadow-sm ${r.status === 'expired' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'}`}>
                 <div className={`p-2.5 rounded-xl mt-0.5 ${r.status === 'expired' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'}`}>{r.status === 'expired' ? <AlertTriangle size={20} /> : <Bell size={20} />}</div>
                 <div className="flex-1 pt-1"><p className="text-[15px] font-bold text-slate-800 leading-tight mb-1">{r.name}</p><p className={`text-[12px] font-bold ${r.status === 'expired' ? 'text-red-500' : 'text-amber-600'}`}>{r.status === 'expired' ? `Quá hạn ${r.days} ngày!` : `Còn ${r.days} ngày tới hạn.`}</p></div>
               </div>
             ))
           )}
         </div>
       </div>
    </div>
  ); 
}

function EditSettingModule({ title, icon, value, type, suffix, onClose, onSave }) {
  const [val, setVal] = useState(value);
  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
      <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4"><div className="p-3 bg-slate-50 rounded-2xl text-slate-600">{icon}</div><h2 className="text-xl font-bold text-slate-800">{title}</h2></div>
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button>
        </div>
        <div className="space-y-4">
          <div className="relative"><input type={type} autoFocus className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xl font-black outline-none focus:bg-white transition-all" value={val} onChange={e => setVal(e.target.value)} />{suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">{suffix}</span>}</div>
          <button onClick={() => onSave(val)} className="w-full bg-slate-900 text-white font-bold py-5 rounded-3xl mt-4">LƯU THAY ĐỔI</button>
        </div>
      </div>
    </div>
  );
}

function ProfileModule({ currentName, currentAvatar, onClose, onSave }) {
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState(currentAvatar);
  const fileRef = useRef();
  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
      <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
        <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-4"><div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><User size={24}/></div><h2 className="text-xl font-bold text-slate-800">Hồ sơ</h2></div><button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button></div>
        <div className="flex flex-col items-center gap-6">
          <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){ const r = new FileReader(); r.onloadend = () => setAvatar(r.result); r.readAsDataURL(f); } }}/>
          <div className="w-24 h-24 rounded-full border-4 border-slate-50 overflow-hidden bg-slate-50 relative cursor-pointer" onClick={() => fileRef.current.click()}>{avatar ? <img src={avatar} className="w-full h-full object-cover"/> : <User size={40} className="m-auto mt-6 text-slate-300"/>}</div>
          <div className="w-full space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Họ tên</label><input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-lg font-bold outline-none" value={name} onChange={e => setName(e.target.value)}/></div>
          <button onClick={() => onSave(name, avatar)} className="w-full bg-slate-900 text-white font-bold py-5 rounded-3xl mt-4">XÁC NHẬN</button>
        </div>
      </div>
    </div>
  );
}

function VehicleModule({ vehicleName, plateNumber, insuranceData, licenseData, registrationData, inspectionData, roadFeeData, hullInsuranceData, onClose, onSave }) { 
  const [name, setName] = useState(vehicleName);
  const [plate, setPlate] = useState(plateNumber);
  const [insurance, setInsurance] = useState(insuranceData);
  const [license, setLicense] = useState(licenseData);
  const [registration, setRegistration] = useState(registrationData);
  const [inspection, setInspection] = useState(inspectionData);
  const [roadFee, setRoadFee] = useState(roadFeeData);
  const [hullInsurance, setHullInsurance] = useState(hullInsuranceData);

  const handleFileChange = (setter, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(prev => ({ ...prev, image: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
      <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500 max-h-[90vh] overflow-y-auto scrollbar-hide flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0"><div className="flex items-center gap-4"><div className="p-3 bg-slate-50 rounded-2xl text-slate-700"><Car size={24}/></div><h2 className="text-xl font-bold text-slate-800">Thông tin xe</h2></div><button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button></div>
        <div className="space-y-6 flex-1">
          <div className="space-y-4"><div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên xe / Dòng xe</label><input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-lg font-bold outline-none" value={name} onChange={e => setName(e.target.value)}/></div><div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Biển số</label><input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-lg font-bold outline-none" value={plate} onChange={e => setPlate(e.target.value)}/></div></div>
          <div className="h-px w-full bg-slate-100"></div>
          <DocumentSection title="Cà vẹt" icon={<FileText size={18} className="text-indigo-500" />} data={registration} onChangeNote={v => setRegistration(p => ({...p, note: v}))} onFileChange={e => handleFileChange(setRegistration, e)} onRemove={() => setRegistration(p => ({...p, image: null}))} />
          <DocumentSection title="Đăng kiểm" icon={<BadgeCheck size={18} className="text-emerald-500" />} data={inspection} isDate onChangeNote={v => setInspection(p => ({...p, note: v}))} onChangeDate={v => setInspection(p => ({...p, expiryDate: v}))} onFileChange={e => handleFileChange(setInspection, e)} onRemove={() => setInspection(p => ({...p, image: null}))} />
          <DocumentSection title="Phí đường bộ" icon={<MapIcon size={18} className="text-amber-500" />} data={roadFee} isDate onChangeNote={v => setRoadFee(p => ({...p, note: v}))} onChangeDate={v => setRoadFee(p => ({...p, expiryDate: v}))} onFileChange={e => handleFileChange(setRoadFee, e)} onRemove={() => setRoadFee(p => ({...p, image: null}))} />
          <DocumentSection title="Bảo hiểm TNDS" icon={<ShieldCheck size={18} className="text-teal-500" />} data={insurance} isDate onChangeNote={v => setInsurance(p => ({...p, note: v}))} onChangeDate={v => setInsurance(p => ({...p, expiryDate: v}))} onFileChange={e => handleFileChange(setInsurance, e)} onRemove={() => setInsurance(p => ({...p, image: null}))} />
          <DocumentSection title="Bảo hiểm thân vỏ" icon={<Shield size={18} className="text-rose-500" />} data={hullInsurance} isDate onChangeNote={v => setHullInsurance(p => ({...p, note: v}))} onChangeDate={v => setHullInsurance(p => ({...p, expiryDate: v}))} onFileChange={e => handleFileChange(setHullInsurance, e)} onRemove={() => setHullInsurance(p => ({...p, image: null}))} />
        </div>
        <div className="pt-6 mt-auto"><button onClick={() => onSave({ name, plate, insurance, license, registration, inspection, roadFee, hullInsurance })} className="w-full bg-slate-900 text-white font-bold py-5 rounded-3xl mt-4">LƯU THÔNG TIN</button></div>
      </div>
    </div>
  ); 
}

function DocumentSection({ title, icon, data, isDate, onChangeNote, onChangeDate, onFileChange, onRemove }) {
  const fileRef = useRef(null);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">{icon}<span className="font-bold text-slate-800">{title}</span></div>
      <input type="text" placeholder="Ghi chú..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none" value={data.note} onChange={e => onChangeNote(e.target.value)} />
      {isDate && <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Hết hạn</label><input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none" value={data.expiryDate || ''} onChange={e => onChangeDate(e.target.value)}/></div>}
      <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={onFileChange} />
      {data.image ? <div className="relative w-full h-32 rounded-2xl overflow-hidden mt-2"><img src={data.image} className="w-full h-full object-cover" /><button onClick={onRemove} className="absolute top-3 right-3 bg-black/60 text-white p-1 rounded-full"><X size={16}/></button></div> : <button onClick={() => fileRef.current.click()} className="w-full h-12 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 text-[12px] font-bold mt-2">Tải ảnh</button>}
    </div>
  );
}