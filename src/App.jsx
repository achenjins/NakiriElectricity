import { useState, useEffect, useMemo, useCallback } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays, differenceInDays } from 'date-fns';
import { Moon, Sun, Zap, Activity, RefreshCw, TrendingDown, TrendingUp, BatteryCharging, CalendarClock, CalendarDays, Home, CloudLightning, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function formatInteger(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(0) : '-';
}

const PRICE_PER_KWH = 0.54;

const TIME_RANGES = [
  { label: '7天', days: 7 },
  { label: '14天', days: 14 },
  { label: '30天', days: 30 },
  { label: '60天', days: 60 },
];

// --- Components ---

const Card = ({ children, className }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn("bg-white dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden", className)}
  >
    {children}
  </motion.div>
);

const StatCard = ({ title, value, subtext, icon: Icon, delay, highlight, compact, costText }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: delay * 0.1 }}
    className={cn(
      "flex flex-col rounded-xl border transition-all",
      compact ? "p-3" : "p-4", 
      highlight 
        ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" 
        : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800/50"
    )}
  >
    <div className={cn("flex items-center justify-between", compact ? "mb-1.5" : "mb-2")}>
        <div className={cn("flex items-center gap-2", highlight ? "text-blue-600 dark:text-blue-400" : "text-zinc-500 dark:text-zinc-400")}>
            <Icon size={compact ? 16 : 18} />
            <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{title}</span>
        </div>
    </div>
    <div className={cn("font-bold truncate", compact ? "text-xl" : "text-2xl", highlight ? "text-blue-700 dark:text-blue-300" : "text-zinc-900 dark:text-zinc-100")}>
      {value}
    </div>
    {costText && (
      <div className="text-[11px] mt-0.5 text-amber-600/70 dark:text-amber-400/70 font-medium">
        {costText}
      </div>
    )}
    <div className={cn("truncate", compact ? "text-[10px] mt-0.5" : "text-xs mt-1", highlight ? "text-blue-500/70 dark:text-blue-400/70" : "text-zinc-400")}>
      {subtext}
    </div>
  </motion.div>
);

const ErrorAlert = ({ message, onRetry }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"
  >
    <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
    <div className="flex-1">
      <div className="text-sm font-medium text-red-800 dark:text-red-200">加载失败</div>
      <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">{message}</div>
    </div>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        重试
      </button>
    )}
  </motion.div>
);

// --- Main App ---


// --- Calendar Components ---

const DayCalendar = ({ data, darkMode }) => {
  const monthSet = [...new Set(data.map(d => d.fullDate.slice(0, 7)))].sort();
  const [monthIdx, setMonthIdx] = useState(0);
  const current = monthSet[monthIdx] || '';

  if (!current) return <div className="text-center text-zinc-400 py-8">暂无数据</div>;

  const y = parseInt(current.slice(0, 4));
  const m = parseInt(current.slice(5, 7));
  const fd = new Date(y, m - 1, 1).getDay();
  const dim = new Date(y, m, 0).getDate();

  const dm = {};
  data.forEach(d => {
    if (d.fullDate.slice(0, 7) === current) dm[d.fullDate.slice(8)] = d;
  });

  const cells = [];
  for (let i = 0; i < fd; i++) cells.push({ e: true });
  for (let d = 1; d <= dim; d++) {
    cells.push({ e: false, day: d, data: dm[String(d).padStart(2, '0')] });
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-4 mb-3">
        <button onClick={() => setMonthIdx(i => Math.max(0, i - 1))} disabled={monthIdx <= 0}
          className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30">
          <ChevronLeft size={20} />
        </button>
        <span className="text-base font-bold text-zinc-700 dark:text-zinc-300 min-w-[100px] text-center">{current}</span>
        <button onClick={() => setMonthIdx(i => Math.min(monthSet.length - 1, i + 1))} disabled={monthIdx >= monthSet.length - 1}
          className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30">
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['日','一','二','三','四','五','六'].map(w => <div key={w} className="text-center text-xs text-zinc-400 py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (cell.e) return <div key={i} />;
          const d = cell.data;
          const has = d && (d.consume > 0 || d.recharge > 0);
return (d && d.recharge > 0) ? (
              /* 充值日：蓝色光晕 + hover 翻转 */
              <div key={i} className="[perspective:600px] group">
                <div className="relative w-full [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] transition-transform duration-500">
                  {/* 正面 */}
                  <div className={cn(
                    "flex flex-col items-center justify-center p-1.5 rounded-lg border min-h-[80px] [backface-visibility:hidden]",
                    "shadow-[0_0_12px_rgba(59,130,246,0.4)] dark:shadow-[0_0_16px_rgba(59,130,246,0.3)]",
                    "border-blue-300 dark:border-blue-600 animate-[pulse_2s_ease-in-out_infinite]",
                    "bg-white dark:bg-zinc-800/60"
                  )}>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{cell.day}</span>
                    {d.consume > 0 && <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200 leading-tight">-{d.consume} kWh</span>}
                    {d.consume > 0 && <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">&yen;{(d.consume * PRICE_PER_KWH).toFixed(1)}</span>}
                    {d.consume <= 0 && <span className="text-sm text-zinc-400 leading-tight">-</span>}
                  </div>
                  {/* 背面：大写金额 */}
                  <div className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center p-1.5 rounded-lg border min-h-[80px] [backface-visibility:hidden] [transform:rotateY(180deg)]",
                    "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600"
                  )}>
                    <span className="text-xs font-medium text-blue-500">{cell.day}</span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">+{d.recharge} kWh</span>
                    <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">&yen;{(d.recharge * PRICE_PER_KWH).toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* 普通日或仅消耗 */
              <div key={i} className={cn(
                "flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all min-h-[80px]",
                "border-zinc-200 dark:border-zinc-700/50",
                has ? "bg-white dark:bg-zinc-800/60" : "bg-white dark:bg-zinc-800/40 opacity-60"
              )}>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{cell.day}</span>
                {has ? (<>
                  <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200 leading-tight">
                    {d.consume > 0 ? "-" : "+"}{d.consume > 0 ? d.consume : d.recharge} kWh
                  </span>
                  <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">
                    &yen;{((d.consume > 0 ? d.consume : d.recharge) * PRICE_PER_KWH).toFixed(1)}
                  </span>
                </>) : (
                  <span className="text-sm text-zinc-300 dark:text-zinc-600 leading-tight">-</span>
                )}
              </div>
            )
          ;
        })}
      </div>
    </div>
  );
};

// ---

const MonthCalendar = ({ data, darkMode }) => {
  const monthMap = {};
  data.forEach(d => {
    const mo = d.fullDate.slice(0, 7);
    if (!monthMap[mo]) monthMap[mo] = { consume: 0, recharge: 0 };
    monthMap[mo].consume = Math.round((monthMap[mo].consume + d.consume) * 100) / 100;
    monthMap[mo].recharge = Math.round((monthMap[mo].recharge + d.recharge) * 100) / 100;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Object.keys(monthMap).sort().map(mo => {
        const m = monthMap[mo];
        const costC = (m.consume * PRICE_PER_KWH).toFixed(1);
        const costR = (m.recharge * PRICE_PER_KWH).toFixed(1);
        return (
          <div key={mo} className="[perspective:600px] group cursor-pointer">
            <div className="relative w-full [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] transition-transform duration-500">
              <div className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border min-h-[120px] [backface-visibility:hidden]",
                "bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/50 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:border-blue-300 dark:group-hover:border-blue-600 transition-colors duration-300"
              )}>
                <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400 mb-2">{mo}</div>
                <div className="text-3xl font-bold text-zinc-800 dark:text-zinc-200">-{Math.round(m.consume)} kWh</div>
                <div className="text-sm font-medium text-amber-500 dark:text-amber-400 mt-1">&yen;{costC}</div>
              </div>
              <div className={cn(
                "absolute inset-0 flex flex-col items-center justify-center p-4 rounded-xl border min-h-[120px] [backface-visibility:hidden] [transform:rotateY(180deg)]",
                "bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/50 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:border-blue-300 dark:group-hover:border-blue-600 transition-colors duration-300"
              )}>
                <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400 mb-2">{mo}</div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">+{Math.round(m.recharge)} kWh</div>
                <div className="text-sm font-medium text-amber-500 dark:text-amber-400 mt-1">&yen;{costR}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true; 
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setDarkMode(e.matches);
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [targetRoom, setTargetRoom] = useState(null); 
  const [roomDisplayName, setRoomDisplayName] = useState('Loading...'); 
  const [timeRange, setTimeRange] = useState(7);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'calendar'
  const [calendarMode, setCalendarMode] = useState('day'); // 'day' | 'month'

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // 将数据获取逻辑抽离，方便复用
  const fetchData = useCallback(async (isInitial = false) => {
      if (isInitial) {
        setLoading(true);
        setError(null);
      }
      try {
          // Fetch from local JSON file (generated by GitHub Actions)
          const res = await fetch('./data.json?t=' + Date.now()); // 添加时间戳防止缓存
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load data`);
          
          const data = await res.json();
          
          // Validate data structure
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format');
          }
          
          // Update State
          if (data.room_info) {
            setTargetRoom(data.room_info.roomId);
            setRoomDisplayName(data.room_info.displayName || 'Unknown Room');
            setLastUpdate(data.room_info.updatedAt);
          }
          
          if (data.history && Array.isArray(data.history)) {
             // Filter out invalid entries and sort by timestamp
             const validData = data.history
               .filter(item => item.timestamp && typeof item.kWh === 'number')
               .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
             setRawData(validData);
          } else {
            setRawData([]);
          }
          
          setError(null);
      } catch (e) {
          console.error("Fetch failed:", e);
          setError(e.message);
          setRoomDisplayName("数据加载失败");
      } finally {
          if (isInitial) setLoading(false);
      }
  }, []);

  // 核心功能：手动触发爬虫 (GitHub Pages 版本) - 提示用户手动触发 GitHub Actions
  const handleManualScrape = () => {
      window.open(
        'https://github.com/' + 
        (window.location.hostname.split('.')[0] || 'Dainsleif233') + 
        '/NakiriElectricity/actions',
        '_blank'
      );
  };

  // Initial Config & Data Fetch
  useEffect(() => {
      fetchData(true);

      // Refresh data every 5 minutes
      const interval = setInterval(() => {
          fetchData(false);
      }, 60000 * 5); 
      return () => clearInterval(interval);
  }, [fetchData]);

  // 1. Prepare Chart Data — globally dedup: keep only when kWh changes
  const chartData = useMemo(() => {
    if (!rawData.length || !targetRoom) return [];

    const now = new Date();
    const cutoff = subDays(now, timeRange);
    
    // Filter + sort globally by time
    const sorted = rawData
      .filter(d => {
        try {
          const ts = new Date(d.timestamp);
          return ts > cutoff && !isNaN(ts.getTime());
        } catch {
          return false;
        }
      })
      .filter(d => String(d.room_id) === String(targetRoom) && typeof d.kWh === 'number')
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Global dedup: skip adjacent identical values (change < 0.01)
    const result = [];
    let lastKwh = null;
    sorted.forEach(item => {
      if (lastKwh === null || Math.abs(item.kWh - lastKwh) >= 0.01) {
        result.push({
          timestamp: new Date(item.timestamp).getTime(),
          val: item.kWh
        });
        lastKwh = item.kWh;
      }
    });

    return result;
  }, [rawData, timeRange, targetRoom]);

  // 2. Calculate Stats (based on daily minimum kWh)
  const stats = useMemo(() => {
    if (!rawData.length || !targetRoom) return null;
    
    const roomData = rawData
        .filter(d => String(d.room_id) === String(targetRoom) && d.timestamp && typeof d.kWh === 'number')
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (roomData.length === 0) return null;

    const now = new Date();
    const currentKWh = roomData[roomData.length - 1].kWh;

    // Build daily minimum map
    const dailyMinMap = {};
    roomData.forEach(d => {
        const day = format(new Date(d.timestamp), 'yyyy-MM-dd');
        if (!dailyMinMap[day]) dailyMinMap[day] = Infinity;
        dailyMinMap[day] = Math.min(dailyMinMap[day], d.kWh);
    });

    const sortedDays = Object.keys(dailyMinMap).sort();

    // Daily consumption = prev day min - current day min
    const dailyConsumptions = [];
    for (let i = 1; i < sortedDays.length; i++) {
        const diff = dailyMinMap[sortedDays[i-1]] - dailyMinMap[sortedDays[i]];
        if (diff > 0) {
            dailyConsumptions.push({ date: sortedDays[i], consumption: diff });
        }
    }

    // 昨日消耗
    const yesterday = format(subDays(now, 1), 'yyyy-MM-dd');
    const yesterdayEntry = dailyConsumptions.find(d => d.date === yesterday);
    const consumptionDaily = yesterdayEntry ? yesterdayEntry.consumption : 0;

    // 单日最大/最小消耗
    let maxDaily = { val: 0, date: '-' };
    let minDaily = { val: 9999, date: '-' };
    dailyConsumptions.forEach(d => {
        if (d.consumption > maxDaily.val) maxDaily = { val: d.consumption, date: d.date.slice(5) };
        if (d.consumption < minDaily.val) minDaily = { val: d.consumption, date: d.date.slice(5) };
    });
    if (minDaily.val === 9999) minDaily.val = 0;

    // 30天消耗
    const cutoff30 = format(subDays(now, 30), 'yyyy-MM-dd');
    const cons30d = dailyConsumptions
        .filter(d => d.date >= cutoff30)
        .reduce((sum, d) => sum + d.consumption, 0);

    // 充值检测
    let lastRechargeTime = null;
    let lastRechargeAmount = 0;
    for (let i = roomData.length - 1; i > 0; i--) {
        const curr = roomData[i].kWh;
        const prev = roomData[i-1].kWh;
        if (curr > prev + 1.0) { 
            lastRechargeTime = roomData[i].timestamp;
            lastRechargeAmount = curr - prev;
            break;
        }
    }

    // 预计可用天数
    let daysRemaining = '0';
    const avgConsumption = dailyConsumptions.length > 0
        ? dailyConsumptions.reduce((s, d) => s + d.consumption, 0) / dailyConsumptions.length
        : 0;
    if (avgConsumption > 0) daysRemaining = (currentKWh / avgConsumption).toFixed(0);

    const daysSinceRecharge = lastRechargeTime 
        ? differenceInDays(now, new Date(lastRechargeTime)) 
        : '-';

    // 消费金额计算
    const toCost = (kwh) => (kwh * PRICE_PER_KWH).toFixed(2);

    return {
        current: formatInteger(currentKWh),
        currentCost: toCost(currentKWh),
        consDaily: formatInteger(consumptionDaily),
        consDailyCost: toCost(consumptionDaily),
        maxDaily: { ...maxDaily, val: formatInteger(maxDaily.val) },
        maxDailyCost: toCost(maxDaily.val),
        minDaily: { ...minDaily, val: formatInteger(minDaily.val) },
        minDailyCost: toCost(minDaily.val === 9999 ? 0 : minDaily.val),
        cons30d: formatInteger(cons30d),
        cons30dCost: toCost(cons30d),
        lastRecharge: {
            date: lastRechargeTime ? format(new Date(lastRechargeTime), 'MM-dd') : '-',
            time: lastRechargeTime ? format(new Date(lastRechargeTime), 'HH:mm') : '',
            amount: lastRechargeAmount > 0 ? formatInteger(lastRechargeAmount) : '-',
            cost: lastRechargeAmount > 0 ? toCost(lastRechargeAmount) : '-',
            daysAgo: daysSinceRecharge
        },
        estimateDays: daysRemaining
    };

  }, [rawData, targetRoom]);

  // 3. Calendar Data — from adjacent deduped points, detect recharge same-day
  const calendarData = useMemo(() => {
    if (!rawData.length || !targetRoom) return [];
    
    const roomData = rawData
      .filter(d => String(d.room_id) === String(targetRoom) && typeof d.kWh === 'number')
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const deduped = [];
    let lastKwh = null;
    roomData.forEach(d => {
      if (lastKwh === null || Math.abs(d.kWh - lastKwh) >= 0.01) {
        deduped.push(d);
        lastKwh = d.kWh;
      }
    });
    
    const dailyMap = {};
    for (let i = 1; i < deduped.length; i++) {
      const prevKwh = deduped[i-1].kWh;
      const curr = deduped[i];
      const diff = Math.round((prevKwh - curr.kWh) * 100) / 100;
      const day = format(new Date(curr.timestamp), 'yyyy-MM-dd');
      
      if (!dailyMap[day]) {
        dailyMap[day] = { fullDate: day, consume: 0, recharge: 0, ts: new Date(day).getTime() };
      }
      
      if (diff > 0) {
        dailyMap[day].consume = Math.round((dailyMap[day].consume + diff) * 100) / 100;
      } else if (diff < -1.0) {
        dailyMap[day].recharge = Math.round((dailyMap[day].recharge + Math.abs(diff)) * 100) / 100;
      }
    }
    
    return Object.values(dailyMap).sort((a, b) => a.ts - b.ts);
  }, [rawData, targetRoom]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans selection:bg-red-500/30 transition-colors duration-300">
      
      <nav className="sticky top-0 z-50 backdrop-blur-lg border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-black/70">
        <div className="w-full px-6 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/20">
              N
            </div>
            <h1 className="text-lg font-bold tracking-tight">Nakiri <span className="text-zinc-400 font-normal">Electricity</span></h1>
          </div>
          <div className="flex items-center gap-2">
             {/* 远程更新按钮 */}
             <button 
              onClick={handleManualScrape}
              className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500 group relative"
              title="打开 GitHub Actions（手动触发更新）"
            >
              <CloudLightning size={20} className="group-hover:text-yellow-500 transition-colors" />
            </button>

            {/* 本地刷新按钮 */}
            <button 
              onClick={() => fetchData(false)}
              className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
              title={lastUpdate ? `刷新数据（上次更新: ${format(new Date(lastUpdate), 'MM-dd HH:mm')}）` : "刷新数据"}
            >
              <RefreshCw size={20} className={cn(loading && "animate-spin")} />
            </button>
            
            {/* 黑暗模式切换 */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
              title={darkMode ? "切换到浅色模式" : "切换到深色模式"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="w-full px-6 md:px-8 py-6 md:py-8">
        
        <AnimatePresence>
          {error && <ErrorAlert message={error} onRetry={() => fetchData(true)} />}
        </AnimatePresence>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8">
          
          {/* Left Column */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* 1. Room Info */}
            <section>
                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                        <Home size={20} />
                    </div>
                    <div className="overflow-hidden">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">当前监控房间</div>
                        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate" title={roomDisplayName}>
                            {roomDisplayName}
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Primary Stats */}
            <section>
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">核心指标</h2>
              <div className="grid grid-cols-2 gap-3">
                {stats ? (
                  <>
                    <StatCard 
                        title="当前电量" 
                        value={`${stats.current} kWh`} 
                        costText={`≈ ${stats.currentCost} 元`}
                        subtext="实时剩余" 
                        icon={Zap} 
                        delay={1} 
                        highlight={true}
                    />
                    <StatCard 
                        title="昨日消耗" 
                        value={`${stats.consDaily} kWh`} 
                        costText={`≈ ${stats.consDailyCost} 元`}
                        subtext="最近波动" 
                        icon={Activity} 
                        delay={2} 
                    />
                    <StatCard 
                        title="单日最大消耗" 
                        value={`${stats.maxDaily.val} kWh`} 
                        costText={`≈ ${stats.maxDailyCost} 元`}
                        subtext={stats.maxDaily.date} 
                        icon={TrendingUp} 
                        delay={3} 
                    />
                    <StatCard 
                        title="单日最小消耗" 
                        value={`${stats.minDaily.val} kWh`} 
                        costText={`≈ ${stats.minDailyCost} 元`}
                        subtext={stats.minDaily.date} 
                        icon={TrendingDown} 
                        delay={4} 
                    />
                  </>
                ) : (
                    <div className="col-span-2 text-center text-zinc-500 py-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        数据加载中...
                    </div>
                )}
              </div>
            </section>

            {/* 3. Time Range */}
            <section>
               <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">趋势范围</h2>
               <div className="bg-zinc-200 dark:bg-zinc-900 p-1 rounded-lg flex">
                 {TIME_RANGES.map(range => (
                   <button
                    key={range.days}
                    onClick={() => setTimeRange(range.days)}
                    className={cn(
                      "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                      timeRange === range.days 
                        ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    )}
                   >
                     {range.label}
                   </button>
                 ))}
               </div>
            </section>

            {/* 4. Detailed Analysis */}
            {stats && (
                <section className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">深度分析</h2>
                  
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <StatCard 
                        title="30天消耗" 
                        value={stats.cons30d} 
                        subtext="kWh" 
                        costText={`≈ ${stats.cons30dCost} 元`}
                        icon={CalendarDays} 
                        delay={8}
                        compact={true} 
                    />
                    <StatCard 
                        title="上次充值" 
                        value={stats.lastRecharge.amount !== '-' ? `+${stats.lastRecharge.amount}` : '-'} 
                        subtext={`${stats.lastRecharge.date} ${stats.lastRecharge.time}`}
                        costText={stats.lastRecharge.cost !== '-' ? `约${stats.lastRecharge.cost}元` : undefined}
                        icon={BatteryCharging} 
                        delay={6}
                        compact={true}
                    />
                    <StatCard 
                        title="预计可用" 
                        value={`${stats.estimateDays}`} 
                        subtext="天" 
                        icon={CalendarClock} 
                        delay={7}
                        compact={true}
                    />
                  </div>
                </section>
            )}

          </div>

          <div className="xl:col-span-3 space-y-6">
            <Card className="p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    电量趋势
                    <span className="text-sm font-normal text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        {roomDisplayName}
                    </span>
                </h2>
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <button
                    onClick={() => setViewMode(v => v === 'chart' ? 'calendar' : 'chart')}
                    className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-600 dark:text-zinc-400 font-medium mr-1"
                  >
                    {viewMode === 'chart' ? '📅 日历' : '📈 趋势'}
                  </button>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  Live
                </div>
              </div>

                            <div className="w-full flex-1 min-h-[500px]">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center text-zinc-400">
                    Loading data...
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-zinc-400">
                    暂无数据
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {viewMode === 'chart' ? (
                      <motion.div
                        key="chart"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.25 }}
                        className="w-full h-full"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="gradient-room" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#333" : "#eee"} vertical={false} />
                            <XAxis 
                              dataKey="timestamp"
                              type="number"
                              scale="time"
                              domain={['dataMin', 'dataMax']}
                              stroke={darkMode ? "#666" : "#999"} 
                              fontSize={12} 
                              tickMargin={10}
                              minTickGap={40}
                              tickFormatter={(value) => format(new Date(value), timeRange <= 7 ? "MM-dd HH:mm" : "MM-dd")}
                            />
                            <YAxis 
                              width={45}
                              stroke={darkMode ? "#666" : "#999"} 
                              fontSize={12} 
                              domain={['auto', 'auto']}
                              tickFormatter={(value) => formatInteger(value)}
                              allowDataOverflow={false} 
                            />
                            <Tooltip 
                              labelFormatter={(value) => format(new Date(value), timeRange <= 7 ? "MM-dd HH:mm" : "MM-dd")}
                              formatter={(value) => [`${formatInteger(value)} kWh`, '剩余电量']}
                              contentStyle={{ 
                                backgroundColor: darkMode ? 'rgba(24, 24, 27, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                borderColor: darkMode ? '#333' : '#eee',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backdropFilter: 'blur(8px)'
                              }}
                              itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                              labelStyle={{ color: darkMode ? '#ccc' : '#666', marginBottom: '8px' }}
                            />
                             <Area 
                                type="monotone"
                                dataKey="val"
                                name="剩余电量"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#gradient-room)"
                                connectNulls={true}
                                isAnimationActive={true}
                                animationDuration={1500}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                             />
                          </AreaChart>
                        </ResponsiveContainer>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="calendar"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}
                        className="w-full h-full overflow-y-auto"
                      >
                        {/* 日/月切换 */}
                        <div className="flex items-center gap-2 mb-4">
                          <button
                            onClick={() => setCalendarMode('day')}
                            className={cn(
                              "px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
                              calendarMode === 'day'
                                ? "bg-blue-500 text-white shadow-sm"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            )}
                          >
                            日
                          </button>
                          <button
                            onClick={() => setCalendarMode('month')}
                            className={cn(
                              "px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
                              calendarMode === 'month'
                                ? "bg-blue-500 text-white shadow-sm"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            )}
                          >
                            月
                          </button>
                        </div>

                        {calendarData.length === 0 ? (
                          <div className="h-full w-full flex items-center justify-center text-zinc-400">
                            暂无日历数据
                          </div>
                        ) : calendarMode === 'day' ? (
                          /* -------- 日视图：方格日历 -------- */
                          <DayCalendar data={calendarData} darkMode={darkMode} />
                        ) : (
                          /* -------- 月视图：按月汇总 -------- */
                          <MonthCalendar data={calendarData} darkMode={darkMode} />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
