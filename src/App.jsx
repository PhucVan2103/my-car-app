import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Home, History, BarChart3, Settings, X, Fuel, Wrench, Navigation2, 
  Lock, Unlock, CheckCircle2, ChevronRight, Bell, MapPin, ShieldCheck, 
  Calendar, Thermometer, FileText, Droplets, Camera, Sparkles, Package, 
  Hammer, ChevronDown, User, Car, Database, CreditCard, BadgeCheck, 
  Map as MapIcon, Shield, AlertTriangle, LocateFixed, Loader2, Play, Square, Navigation,
  Trash2, Pencil 
} from 'lucide-react';

// Constants
const CAR_IMAGE = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1000";
const DEFAULT_DIESEL_PRICE = 20500; 

// Helper func
const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if(h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * MAIN APPLICATION COMPONENT
 */
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeModule, setActiveModule] = useState(null);
  const [editMode, setEditMode] = useState(null);
  
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

  // Dữ liệu Chi phí
  const [records, setRecords] = useState([
    { id: 1, type: 'fuel', date: '10/05/2026', cost: 1050000, pricePerLiter: 20500, liters: 51.2, location: 'Petrolimex Q1', odo: 45150 },
    { id: 2, type: 'maintenance', date: '20/04/2026', cost: 1500000, odo: 44000, title: 'Thay nhớt định kỳ' }
  ]);

  // Dữ liệu Hành trình
  const [trips, setTrips] = useState([
    { id: 1, date: '12/05/2026', time: '14:30', duration: '45 phút', distance: 12.4, from: 'Quận 1, TP.HCM', to: 'Quận 7, TP.HCM' },
    { id: 2, date: '10/05/2026', time: '08:15', duration: '1h 20m', distance: 35.0, from: 'TP.HCM', to: 'Biên Hòa' }
  ]);

  // State Hành trình hiện tại (Đưa ra global để không bị mất khi tắt popup)
  const [isRecordingTrip, setIsRecordingTrip] = useState(false);
  const [ongoingTrip, setOngoingTrip] = useState({
    timer: 0,
    from: '',
    to: '',
    distance: '0',
    startCoords: null,
    isReviewing: false
  });
  
  const [editingTrip, setEditingTrip] = useState(null);

  useEffect(() => {
    let interval = null;
    if (isRecordingTrip && !ongoingTrip.isReviewing) {
      interval = setInterval(() => {
        setOngoingTrip(prev => ({ ...prev, timer: prev.timer + 1 }));
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecordingTrip, ongoingTrip.isReviewing]);

  const fuelPercentage = Math.round((currentFuelLiters / tankCapacity) * 100);

  // Reminders logic
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

  const handleSaveTrip = (tripDataToSave) => {
    setTrips(prev => [{ ...tripDataToSave, id: Date.now() }, ...prev]);
    setIsRecordingTrip(false);
    setOngoingTrip({ timer: 0, from: '', to: '', distance: '0', startCoords: null, isReviewing: false });
    setActiveModule(null);
  };

  const handleCancelTrip = () => {
    setIsRecordingTrip(false);
    setOngoingTrip({ timer: 0, from: '', to: '', distance: '0', startCoords: null, isReviewing: false });
    setActiveModule(null);
  };

  const handleDeleteTrip = (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa hành trình này?")) {
      setTrips(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleUpdateTrip = (updatedTrip) => {
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
    setEditingTrip(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans antialiased text-slate-900">
      {/* iPhone Chassis */}
      <div className="relative w-[390px] h-[844px] bg-white rounded-[55px] border-[8px] border-slate-800 shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5">
        
        {/* Dynamic Island Area */}
        <div className="absolute top-0 left-0 w-full h-12 flex justify-between items-end px-8 pb-1 z-[100] text-black text-[12px] font-bold pointer-events-none">
          <span>9:41</span>
          <div className="w-24 h-6 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-3"></div>
          <div className="flex gap-1.5 items-center">
            <div className="flex gap-0.5">
               <div className="w-1 h-3 bg-black rounded-full"></div>
               <div className="w-1 h-3 bg-black rounded-full"></div>
            </div>
            <div className="w-5 h-2.5 border border-black/30 rounded-[2px] relative">
              <div className="absolute inset-[1px] bg-black w-[80%] rounded-[1px]"></div>
            </div>
          </div>
        </div>

        {/* App Content Area */}
        <div className="flex-1 relative flex flex-col pt-12 overflow-hidden bg-white">
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
                isRecording={isRecordingTrip} 
                onStartTrip={() => setActiveModule('trip')} 
                onDeleteTrip={handleDeleteTrip}
                onEditTrip={(trip) => setEditingTrip(trip)}
              />
            )}
            {activeTab === 'expenses' && <ExpensesView records={records} />}
            {activeTab === 'settings' && (
              <SettingsView 
                tankCapacity={tankCapacity} vehicleName={vehicleName} plateNumber={plateNumber} 
                userName={userName} userAvatar={userAvatar} remindersCount={reminders.length} 
                onEdit={setEditMode} 
              />
            )}
          </div>

          {/* Navigation Bar - FIXED AT BOTTOM */}
          <div className="absolute bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-100 px-8 pt-3 pb-8 flex justify-between items-center z-[90]">
            <NavBtn icon={<Home size={22} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavBtn icon={<MapIcon size={22} />} active={activeTab === 'trip'} onClick={() => setActiveTab('trip')} />
            <NavBtn icon={<History size={22} />} active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} />
            <NavBtn 
              icon={<div className="relative"><Settings size={22} />{reminders.length > 0 && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></div>}</div>} 
              active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} 
            />
          </div>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/10 rounded-full z-[100]"></div>
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
        
        {editingTrip && (
          <EditTripModule 
            trip={editingTrip} 
            onSave={handleUpdateTrip} 
            onClose={() => setEditingTrip(null)} 
          />
        )}
        
        {editMode === 'profile' && <ProfileModule currentName={userName} currentAvatar={userAvatar} onClose={() => setEditMode(null)} onSave={(n, a) => { setUserName(n); setUserAvatar(a); setEditMode(null); }} />}
        {editMode === 'vehicle_details' && <VehicleModule vehicleName={vehicleName} plateNumber={plateNumber} insuranceData={insuranceData} licenseData={licenseData} registrationData={registrationData} inspectionData={inspectionData} roadFeeData={roadFeeData} hullInsuranceData={hullInsuranceData} onClose={() => setEditMode(null)} onSave={(d) => { setVehicleName(d.name); setPlateNumber(d.plate); setInsuranceData(d.insurance); setLicenseData(d.license); setRegistrationData(d.registration); setInspectionData(d.inspection); setRoadFeeData(d.roadFee); setHullInsuranceData(d.hullInsurance); setEditMode(null); }} />}
        {editMode === 'capacity' && <EditSettingModule title="Dung tích bình" icon={<Droplets size={24}/>} value={tankCapacity} type="number" suffix="Lít" onClose={() => setEditMode(null)} onSave={(v) => { setTankCapacity(Number(v) || 0); setEditMode(null); }} />}
        
        {/* CSS Animation for Marquee & Others */}
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 20s linear infinite;
            width: max-content;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          .slanted-stripe {
            background: repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 10px, #f8fafc 10px, #f8fafc 20px);
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
            100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
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
  return (
    <div className="px-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mt-4">
        <h2 className="text-2xl font-bold text-slate-800">Chào {userName}!</h2>
        <button onClick={() => onSelectModule('notifications')} className="relative p-3 bg-slate-50 rounded-2xl text-slate-600">
          <Bell size={20} />
          {reminders.length > 0 && <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></div>}
        </button>
      </div>

      {reminders.length > 0 && (
        <div className="mx-1 mt-5 overflow-hidden bg-white border border-slate-100 rounded-full py-2 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] flex items-center cursor-pointer relative" onClick={() => onSelectModule('notifications')}>
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none rounded-l-full"></div>
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none rounded-r-full"></div>
          
          <div className="flex whitespace-nowrap animate-marquee">
            {reminders.slice(0, 10).map((r, i) => (
              <span key={`a-${i}`} className="mx-3 flex items-center gap-1.5 text-[11px] font-bold">
                <span className={r.status === 'expired' ? 'text-red-500' : 'text-slate-700'}>{r.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] ${r.status === 'expired' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{r.status === 'expired' ? 'Quá hạn' : `Còn ${r.days} ngày`}</span>
                <span className="text-slate-300 ml-3">•</span>
              </span>
            ))}
            {reminders.slice(0, 10).map((r, i) => (
              <span key={`b-${i}`} className="mx-3 flex items-center gap-1.5 text-[11px] font-bold">
                <span className={r.status === 'expired' ? 'text-red-500' : 'text-slate-700'}>{r.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] ${r.status === 'expired' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{r.status === 'expired' ? 'Quá hạn' : `Còn ${r.days} ngày`}</span>
                <span className="text-slate-300 ml-3">•</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative mt-5 h-48 flex items-center justify-center">
        <div className="absolute inset-0 slanted-stripe -z-10 rounded-3xl"></div>
        <img src={CAR_IMAGE} alt="Xe" className="w-[85%] h-auto object-contain drop-shadow-xl" />
      </div>

      <div className="mt-4 bg-slate-900 rounded-[30px] p-5 text-white flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400"><Droplets size={24} fill="currentColor" /></div>
          <div><p className="text-[12px] font-medium opacity-60">Nhiên liệu</p><p className="text-lg font-bold">{fuelPercentage}% • {currentFuelLiters.toFixed(1)}L</p></div>
        </div>
        <div className="text-right"><p className="text-2xl font-bold">640<span className="text-xs ml-1 opacity-60">km</span></p><p className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">Dự kiến đi được</p></div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <GridItem icon={<Fuel size={20} />} label="Diesel Log" val={`${currentFuelLiters.toFixed(0)}L`} desc="Cập nhật chi phí & vị trí" color="bg-blue-50 text-blue-500" onClick={() => onSelectModule('fuel')} />
        <GridItem icon={<Wrench size={20} />} label="Service" val="2318 km" desc="Bảo dưỡng định kỳ" color="bg-amber-50 text-amber-500" onClick={() => onSelectModule('maintenance')} />
        <button 
          onClick={() => onSelectModule('trip')}
          className={`col-span-2 bg-white rounded-[28px] p-5 border border-slate-50 shadow-sm relative overflow-hidden h-36 flex flex-col justify-between text-left active:scale-[0.98] transition-all`}
        >
           <div className="flex justify-between items-start relative z-10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRecordingTrip ? (isReviewing ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500') : 'bg-blue-50 text-blue-500'}`}>
                {isRecordingTrip ? (isReviewing ? <CheckCircle2 size={18} /> : <Navigation size={18} className="animate-bounce" />) : <MapPin size={18} />}
              </div>
              <span className={`text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${isRecordingTrip ? (isReviewing ? 'bg-amber-500' : 'bg-red-500 recording-pulse') : 'bg-slate-400'}`}>
                {isRecordingTrip ? (isReviewing ? 'Chờ xác nhận' : 'Đang ghi hành trình') : 'Sẵn sàng ghi'}
              </span>
           </div>
           <div className="relative z-10">
              <p className="font-bold text-slate-800">Nhật ký di chuyển</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isRecordingTrip 
                  ? (isReviewing ? <span className="text-amber-600 font-bold">Chuyến đi đã dừng, chờ lưu...</span> : <span className="text-red-500 font-bold">Đang di chuyển: {formatTime(ongoingTimer)}</span>)
                  : (lastTrip ? `${lastTrip.distance} km • ${lastTrip.from} ➔ ${lastTrip.to}` : 'Chưa có hành trình nào')}
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

// ----------------------------------------------------------------------
// TRIP VIEW (TAB HÀNH TRÌNH)
// ----------------------------------------------------------------------
function TripMainView({ trips, isRecording, onStartTrip, onDeleteTrip, onEditTrip }) {
  const totalDistance = trips.reduce((acc, t) => acc + (t.distance || 0), 0);
  return (
    <div className="p-6 pt-6 animate-in slide-in-from-right-10 duration-500 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
         <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Hành trình</h2>
            <p className="text-slate-400 text-[12px] font-medium mt-1">Tổng cộng {totalDistance.toFixed(1)} km đã ghi</p>
         </div>
      </div>

      <button 
        onClick={onStartTrip} 
        className={`w-full py-5 rounded-3xl font-bold text-white flex items-center justify-center gap-2 mb-6 shadow-lg active:scale-95 transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`}
      >
        {isRecording ? <Square size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}
        {isRecording ? 'XEM CHUYẾN ĐI HIỆN TẠI' : 'BẮT ĐẦU GHI LỘ TRÌNH MỚI'}
      </button>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-8 space-y-4">
        {trips.length === 0 ? <div className="text-center text-slate-400 font-bold mt-10">Chưa có hành trình nào.</div> : trips.map(t => (
          <div key={t.id} className="relative pl-6 border-l-2 border-slate-100 py-1 ml-2 group">
             <div className="absolute -left-1.5 top-0 w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ring-blue-50"></div>
             <div className="bg-white border border-slate-50 rounded-[24px] p-4 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{t.date} • {t.time}</p>
                    <span className="inline-block mt-1 bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-lg">{t.distance} km</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl">
                    <button onClick={() => onEditTrip(t)} className="text-slate-400 hover:text-blue-500 transition-colors p-1"><Pencil size={14}/></button>
                    <div className="w-px h-3 bg-slate-200"></div>
                    <button onClick={() => onDeleteTrip(t.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 size={14}/></button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                     <div className="w-0.5 h-4 bg-slate-100"></div>
                     <MapPin size={10} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="font-bold text-slate-700 text-[13px] truncate">{t.from}</p>
                     <p className="font-bold text-slate-700 text-[13px] truncate mt-1.5">{t.to}</p>
                  </div>
                  <div className="shrink-0 text-right">
                     <p className="text-[10px] font-bold text-slate-400">Thời gian</p>
                     <p className="font-black text-slate-800">{t.duration}</p>
                  </div>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// EXPENSES VIEW (GỘP LỊCH SỬ & THỐNG KÊ)
// ----------------------------------------------------------------------
function ExpensesView({ records }) {
  const [viewMode, setViewMode] = useState('history'); // 'history' | 'stats'

  return (
    <div className="p-6 pt-6 animate-in slide-in-from-right-10 duration-500 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
         <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Chi phí</h2>
            <p className="text-slate-400 text-[12px] font-medium mt-1">Quản lý và thống kê</p>
         </div>
      </div>

      {/* Switcher */}
      <div className="bg-slate-200/50 p-1 rounded-2xl flex mb-6 shrink-0">
        <button 
          onClick={() => setViewMode('history')} 
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${viewMode === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
        >
          Lịch sử
        </button>
        <button 
          onClick={() => setViewMode('stats')} 
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${viewMode === 'stats' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
        >
          Thống kê
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-8">
        {viewMode === 'history' ? <HistoryContent records={records} /> : <ReportsContent records={records} />}
      </div>
    </div>
  );
}

function HistoryContent({ records }) {
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

  const totals = records.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + curr.cost;
    return acc;
  }, {});

  const summaryCategories = ['fuel', 'maintenance', 'repair', 'wash', 'accessory'];

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6">
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
      
      <div className="space-y-3">
        {records.length === 0 && <p className="text-center text-slate-400 font-bold mt-10">Chưa có dữ liệu.</p>}
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
                     {r.location && (
                       <><div className="w-0.5 h-0.5 bg-slate-300 rounded-full"></div><span className="text-[9px] font-bold text-blue-500 truncate max-w-[120px]">{r.location}</span></>
                     )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-slate-900 text-sm">{new Intl.NumberFormat('vi-VN').format(r.cost)}</p>
                  <p className="text-[9px] font-bold text-slate-400">VNĐ</p>
                </div>
              </div>
              {r.image && (
                <div className="w-full h-32 rounded-xl overflow-hidden mt-1 border border-slate-50">
                  <img src={r.image} alt="Attachment" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportsContent({ records }) {
  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }, []);

  const availableMonths = useMemo(() => {
    const months = new Set();
    months.add(currentMonth);
    records.forEach(r => {
       const parts = r.date.split('/');
       if(parts.length === 3) months.add(parts[1] + '/' + parts[2]); 
    });
    return Array.from(months).sort((a, b) => {
       const [mA, yA] = a.split('/');
       const [mB, yB] = b.split('/');
       return new Date(yB, mB - 1) - new Date(yA, mA - 1);
    });
  }, [records, currentMonth]);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const { categoryData, totalMonth, topCategory } = useMemo(() => {
     const data = { fuel: 0, maintenance: 0, repair: 0, wash: 0, accessory: 0 };
     let total = 0;
     records.forEach(r => {
        const parts = r.date.split('/');
        if(parts.length === 3) {
           const monthYear = parts[1] + '/' + parts[2];
           if(monthYear === selectedMonth && data[r.type] !== undefined) {
              data[r.type] += r.cost;
              total += r.cost;
           }
        }
     });
     
     let topCat = null;
     let maxVal = -1;
     Object.entries(data).forEach(([key, val]) => {
        if (val > maxVal && val > 0) { maxVal = val; topCat = key; }
     });

     return { categoryData: data, totalMonth: total, topCategory: topCat };
  }, [records, selectedMonth]);

  const categories = [
    { id: 'fuel', label: 'Nhiên liệu', color: 'bg-blue-500' },
    { id: 'maintenance', label: 'Bảo dưỡng', color: 'bg-amber-500' },
    { id: 'repair', label: 'Sửa chữa', color: 'bg-red-500' },
    { id: 'wash', label: 'Rửa xe', color: 'bg-cyan-500' },
    { id: 'accessory', label: 'Phụ kiện', color: 'bg-purple-500' },
  ];

  const topCatLabel = categories.find(c => c.id === topCategory)?.label || 'Chưa có';
  const maxCategoryValue = Math.max(...Object.values(categoryData), 1); 

  const formatCurrencyShort = (value) => {
      if (value === 0) return '0';
      if (value >= 1000000) return (value / 1000000).toLocaleString('vi-VN', {maximumFractionDigits: 1}) + 'Tr';
      return (value / 1000).toLocaleString('vi-VN') + 'K';
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-6">
        <div className="relative inline-block w-auto bg-white rounded-xl shadow-sm border border-slate-50">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800 pointer-events-none z-10"><Calendar size={18} strokeWidth={2.5} /></div>
          <select 
            value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none w-full bg-transparent text-slate-800 text-[16px] font-black py-2 pl-10 pr-10 outline-none cursor-pointer relative z-0"
          >
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

      <div className="bg-white border border-slate-50 rounded-[32px] p-6 shadow-sm mb-6">
         <h3 className="text-[13px] font-bold text-slate-800 mb-6">Chi phí từng hạng mục</h3>
         <div className="h-[220px] flex items-end justify-between gap-1 border-b border-slate-100 pb-2 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-2">
               <div className="border-t border-slate-50 w-full h-0"></div><div className="border-t border-slate-50 w-full h-0"></div><div className="border-t border-slate-50 w-full h-0"></div><div className="border-t border-slate-50 w-full h-0"></div>
            </div>

            {totalMonth === 0 ? (
                <div className="w-full text-center text-sm text-slate-400 pb-10">Không có phát sinh chi phí</div>
            ) : (
                categories.map(cat => {
                  const value = categoryData[cat.id];
                  const heightPercent = value > 0 ? Math.max((value / maxCategoryValue) * 100, 5) : 0;
                  return (
                    <div key={cat.id} className="flex-1 flex flex-col items-center gap-1.5 relative group h-full justify-end z-10">
                      <span className={`text-[10px] font-bold transition-all ${value > 0 ? 'text-slate-600' : 'text-transparent'}`}>{formatCurrencyShort(value)}</span>
                      <div 
                        className={`w-full max-w-[32px] rounded-t-lg transition-all duration-700 ${value > 0 ? cat.color : 'bg-slate-100'}`}
                        style={{ height: `${value > 0 ? heightPercent : 2}%` }}
                      >
                         {value > 0 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">{new Intl.NumberFormat('vi-VN').format(value)} đ</div>}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 mt-2 text-center leading-tight line-clamp-2 px-1">{cat.label}</span>
                    </div>
                  );
                })
            )}
         </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SETTINGS VIEW
// ----------------------------------------------------------------------
function SettingsView({ tankCapacity, vehicleName, plateNumber, userName, userAvatar, remindersCount, onEdit }) {
  return (
    <div className="p-6 pt-6 animate-in slide-in-from-right-10 duration-500 h-full">
      <div className="mb-6">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Preferences</p>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Cài đặt</h2>
      </div>

      <div 
        className="bg-white rounded-[28px] p-4 shadow-sm border border-slate-50 flex items-center gap-4 mb-6 cursor-pointer hover:bg-slate-50/50 active:scale-[0.98] transition-all group"
        onClick={() => onEdit('profile')}
      >
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
                  <div className="text-slate-500 bg-slate-50 p-2.5 rounded-xl relative"><Car size={20}/>{remindersCount > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></div>}</div>
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
    </div>
  );
}

// ----------------------------------------------------------------------
// MODALS & HELPER COMPONENTS
// ----------------------------------------------------------------------
function GridItem({ icon, label, val, desc, color, onClick }) {
  return (
    <button onClick={onClick} className="bg-white p-5 rounded-[28px] border border-slate-50 shadow-sm text-left active:scale-95 transition-all flex flex-col justify-between h-36">
      <div className="flex justify-between items-start"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div><span className="text-[10px] font-bold text-slate-400">{val}</span></div>
      <div><p className="font-bold text-slate-800 text-sm leading-tight">{label}</p><p className="text-[9px] text-slate-400 mt-0.5">{desc}</p></div>
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
         <div className="flex items-center gap-4"><div className={`${color} bg-slate-50 p-2.5 rounded-xl`}>{icon}</div><span className="font-bold text-[14px] text-slate-700">{label}</span></div>
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

function TripModule({ isRecording, ongoingTrip, setOngoingTrip, onStart, onStop, onCancelTrip, onClose }) {
  const [isLocating, setIsLocating] = useState(false);

  // Tính khoảng cách bằng công thức Haversine (đường chim bay)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startTripProcess = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ GPS");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=vi`);
          const data = await res.json();
          const road = data.address?.road || data.address?.suburb || 'Chưa rõ đường';
          const city = data.address?.city || data.address?.state || '';
          setOngoingTrip({ timer: 0, from: `${road}, ${city}`, to: '', distance: '0', startCoords: {lat: latitude, lon: longitude}, isReviewing: false });
        } catch {
          setOngoingTrip({ timer: 0, from: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, to: '', distance: '0', startCoords: {lat: latitude, lon: longitude}, isReviewing: false });
        } finally {
          setIsLocating(false);
          onStart();
        }
      },
      (err) => {
        console.error(err);
        setIsLocating(false);
        // Fallback demo data
        setOngoingTrip({ timer: 0, from: 'Hồ Chí Minh (Demo)', to: '', distance: '0', startCoords: {lat: 10.762622, lon: 106.660172}, isReviewing: false });
        onStart();
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const stopTripProcess = () => {
    setIsLocating(true);
    if (!navigator.geolocation || !ongoingTrip.startCoords) {
       setOngoingTrip(p => ({...p, isReviewing: true, to: 'Không rõ'}));
       setIsLocating(false);
       return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let dest = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        let dist = calculateDistance(ongoingTrip.startCoords.lat, ongoingTrip.startCoords.lon, latitude, longitude);
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=vi`);
          const data = await res.json();
          dest = `${data.address?.road || data.address?.suburb || ''}, ${data.address?.city || data.address?.state || ''}`;
        } catch(e) {}
        
        setOngoingTrip(p => ({ ...p, to: dest, distance: dist.toFixed(1), isReviewing: true }));
        setIsLocating(false);
      },
      () => {
        setOngoingTrip(p => ({...p, isReviewing: true, to: 'Biên Hòa (Demo)', distance: '32.5'}));
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const finalizeSave = () => {
    const d = new Date();
    onStop({
      date: d.toLocaleDateString('vi-VN'),
      time: d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}),
      duration: formatTime(ongoingTrip.timer),
      distance: Number(ongoingTrip.distance) || 0,
      from: ongoingTrip.from || 'Chưa rõ',
      to: ongoingTrip.to || 'Chưa rõ'
    });
  };

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
      <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><MapIcon size={24}/></div>
            <h2 className="text-xl font-bold text-slate-800">{isRecording ? (ongoingTrip.isReviewing ? 'Lưu hành trình' : 'Đang di chuyển') : 'Ghi lộ trình mới'}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button>
        </div>

        <div className="flex flex-col items-center">
          {isRecording ? (
            !ongoingTrip.isReviewing ? (
              <>
                <div className="text-5xl font-black text-slate-800 tracking-tighter mb-2">{formatTime(ongoingTrip.timer)}</div>
                <p className="text-sm font-bold text-slate-400 mb-8 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Từ: {ongoingTrip.from}</p>
                <button 
                  onClick={stopTripProcess} disabled={isLocating}
                  className="w-full bg-red-500 text-white font-bold py-5 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isLocating ? <Loader2 className="animate-spin" size={20} /> : <Square size={20} fill="currentColor"/>}
                  {isLocating ? 'ĐANG LẤY TỌA ĐỘ...' : 'KẾT THÚC HÀNH TRÌNH'}
                </button>
              </>
            ) : (
              <div className="w-full space-y-4">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Điểm xuất phát</label>
                   <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={ongoingTrip.from} onChange={e => setOngoingTrip(p => ({...p, from: e.target.value}))} />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Điểm đến (Dự kiến)</label>
                   <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={ongoingTrip.to} onChange={e => setOngoingTrip(p => ({...p, to: e.target.value}))} />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quãng đường (KM)</label>
                   <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={ongoingTrip.distance} onChange={e => setOngoingTrip(p => ({...p, distance: e.target.value}))} />
                 </div>
                 <div className="flex gap-3 mt-4">
                   <button onClick={onCancelTrip} className="w-[100px] bg-red-50 text-red-600 font-bold py-5 rounded-3xl active:scale-95 transition-all flex items-center justify-center shrink-0 border border-red-100">HỦY</button>
                   <button onClick={finalizeSave} className="flex-1 bg-blue-600 text-white font-bold py-5 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><CheckCircle2 size={20} /> LƯU</button>
                 </div>
              </div>
            )
          ) : (
            <div className="space-y-4 w-full text-center">
              <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6"><Navigation size={40} className="-ml-1" /></div>
              <p className="text-slate-500 font-medium text-sm mb-6 px-4">Ứng dụng sẽ sử dụng GPS để theo dõi lộ trình và tự động tính quãng đường di chuyển của bạn.</p>
              <button 
                onClick={startTripProcess} disabled={isLocating}
                className="w-full bg-blue-600 text-white font-bold py-5 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isLocating ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} fill="currentColor"/>}
                {isLocating ? 'ĐANG TÌM GPS...' : 'BẮT ĐẦU ĐI'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditTripModule({ trip, onSave, onClose }) {
  const [from, setFrom] = useState(trip.from);
  const [to, setTo] = useState(trip.to);
  const [distance, setDistance] = useState(trip.distance);
  const [duration, setDuration] = useState(trip.duration);

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
      <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><Pencil size={24}/></div>
            <h2 className="text-xl font-bold text-slate-800">Sửa hành trình</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Điểm xuất phát</label>
            <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Điểm đến</label>
            <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quãng đường (KM)</label>
              <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={distance} onChange={e => setDistance(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Thời gian</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
          </div>
          
          <button 
            onClick={() => onSave({ ...trip, from, to, distance: Number(distance), duration })} 
            className="w-full bg-blue-600 text-white font-bold py-5 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
          >
            <CheckCircle2 size={20} /> CẬP NHẬT
          </button>
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
          } else setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch { setLocation('Petrolimex (Demo)'); } finally { setIsLocating(false); }
      },
      () => { setIsLocating(false); setLocation("Petrolimex Q1"); },
      { timeout: 5000 }
    );
  };

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
      <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
        <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><Droplets size={24}/></div><h2 className="text-xl font-bold text-slate-800">Cập nhật đổ dầu</h2></div><button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button></div>
        <div className="space-y-4">
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tổng chi phí (VNĐ)</label><input type="number" placeholder="0" autoFocus className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all" value={amount} onChange={e => setAmount(e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Giá 1 lít</label><input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-lg font-bold text-slate-800 outline-none" value={pricePerLiter} onChange={e => setPricePerLiter(e.target.value)}/></div><div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Số lít dự kiến</label><div className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-lg font-black text-blue-600 flex items-center justify-center">{calculatedLiters.toFixed(2)} L</div></div></div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vị trí / Cây xăng</label><div className="relative"><MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Nhập địa điểm..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 pr-12 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all" value={location} onChange={e => setLocation(e.target.value)}/><button onClick={handleGetLocation} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500">{isLocating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}</button></div></div>
          <button onClick={() => { if(!amount) return; onSave({ type: 'fuel', cost: Number(amount), pricePerLiter: Number(pricePerLiter), liters: calculatedLiters, location: location || 'N/A', odo: 45200, date: new Date().toLocaleDateString('vi-VN') }); }} className="w-full bg-slate-900 text-white font-bold py-5 rounded-3xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"><CheckCircle2 size={20} /> LƯU NHẬT KÝ</button>
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-end animate-in fade-in duration-300">
      <div className="w-full bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500 max-h-[85vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-4"><div className="p-3 bg-amber-50 rounded-2xl text-amber-500"><Wrench size={24}/></div><h2 className="text-xl font-bold text-slate-800">Dịch vụ & Chi phí</h2></div><button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-300"><X size={20}/></button></div>
        <div className="space-y-5">
          <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Loại chi phí</label><div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">{categories.map(c => <button key={c.id} onClick={() => setExpenseType(c.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border whitespace-nowrap transition-all ${expenseType === c.id ? c.color + ' border-transparent shadow-sm' : 'bg-white border-slate-100 text-slate-500'}`}>{c.icon}<span className="text-sm font-bold">{c.label}</span></button>)}</div></div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Số tiền (VNĐ)</label><input type="number" placeholder="0" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-2xl font-black outline-none focus:bg-white transition-all" value={amount} onChange={e => setAmount(e.target.value)}/></div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nội dung chi tiết</label><input type="text" placeholder="Ví dụ: Thay bình ắc quy..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all" value={note} onChange={e => setNote(e.target.value)}/></div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Hình ảnh</label><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />{image ? <div className="relative w-full h-32 rounded-2xl overflow-hidden"><img src={image} className="w-full h-full object-cover" /><button onClick={() => setImage(null)} className="absolute top-3 right-3 bg-black/60 text-white p-1 rounded-full"><X size={16}/></button></div> : <button onClick={() => fileInputRef.current.click()} className="w-full h-20 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400"><Camera size={20} /><span className="text-[12px] font-bold">Chạm để tải ảnh</span></button>}</div>
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