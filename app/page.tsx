'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Sparkles, 
  Search, 
  Clock, 
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Tag,
  Loader2,
  AlertTriangle
} from 'lucide-react';

import { createClient } from '@/utils/supabase/client';

export type CategoryKey = 'zadanie' | 'wazne' | 'projekt' | 'spotkanie' | 'inne';

export interface EventItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  category: CategoryKey;
  completed: boolean;
}

export interface CategoryDetails {
  name: string;
  color: string;
  text: string;
  border: string;
  bgAlpha: string;
}

const CATEGORIES: Record<CategoryKey, CategoryDetails> = {
  zadanie: { name: 'Do zrobienia', color: 'bg-indigo-500', text: 'text-indigo-400', border: 'border-indigo-500/30', bgAlpha: 'bg-indigo-500/10' },
  wazne: { name: 'Ważne / Pilne', color: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30', bgAlpha: 'bg-red-500/10' },
  projekt: { name: 'Projekt / Praca', color: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/30', bgAlpha: 'bg-purple-500/10' },
  spotkanie: { name: 'Spotkanie / Wydarzenie', color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30', bgAlpha: 'bg-emerald-500/10' },
  inne: { name: 'Inne', color: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', bgAlpha: 'bg-amber-500/10' }
};

const formatYMD = (year: number, monthZeroBased: number, day: number): string => {
  const m = String(monthZeroBased + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const getTodayString = (): string => {
  const d = new Date();
  return formatYMD(d.getFullYear(), d.getMonth(), d.getDate());
};

const addDaysToDate = (daysCount: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysCount);
  return formatYMD(d.getFullYear(), d.getMonth(), d.getDate());
};

export default function CalendarPlannerPage() {
  const supabase = createClient();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // selectedDate = null oznacza pokazywanie WSZYSTKICH wydarzeń
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Stany formularza Gemini
  const [inputTitle, setInputTitle] = useState<string>('');
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [inputDate, setInputDate] = useState<string>(getTodayString());
  const [hasTime, setHasTime] = useState<boolean>(false);
  const [inputTime, setInputTime] = useState<string>('12:00');
  const [inputCategory, setInputCategory] = useState<CategoryKey>('zadanie');

  // Stan potwierdzenia usunięcia
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);

  // Wyszukiwanie i filtrowanie
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const mainGridRef = useRef<HTMLDivElement>(null);

  // Pobranie danych z Supabase na starcie
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from('events').select('*');
      if (data && !error) {
        setEvents(data as EventItem[]);
      }
      setIsLoading(false);
    };

    fetchEvents();
  }, []);

  // Obsługa kliknięcia poza kalendarzem i listą -> reset do pokazania wszystkich zadań
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mainGridRef.current && !mainGridRef.current.contains(event.target as Node)) {
        setSelectedDate(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Generowanie dni dla kalendarza
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;
    
    const daysInMonth = lastDayOfMonth.getDate();
    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, pDay);
      const dateStr = formatYMD(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
      days.push({ dateStr, dayNumber: pDay, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = formatYMD(year, month, i);
      days.push({ dateStr, dayNumber: i, isCurrentMonth: true });
    }
    
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remainingSlots = totalSlots - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = formatYMD(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
      days.push({ dateStr, dayNumber: i, isCurrentMonth: false });
    }
    
    return days;
  }, [currentMonth]);

  const handleOpenPopup = () => {
    if (!inputTitle.trim()) return;
    setInputDate(selectedDate || getTodayString());
    setIsPopupOpen(true);
  };

  const handleKeyDownPrompter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleOpenPopup();
    }
  };

  // Dodawanie do Supabase
  const handleConfirmAddEvent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputTitle.trim()) return;

    const payload = {
      title: inputTitle.trim(),
      date: inputDate || getTodayString(),
      time: hasTime ? inputTime : null,
      category: inputCategory,
      completed: false,
    };

    const { data, error } = await supabase.from('events').insert([payload]).select();

    if (data && !error) {
      setEvents((prev) => [...prev, data[0] as EventItem]);
    }

    setInputTitle('');
    setIsPopupOpen(false);
    setHasTime(false);
  };

  // Zmiana stanu wykonania w Supabase
  const toggleComplete = async (id: string, currentCompleted: boolean) => {
    setEvents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !currentCompleted } : item))
    );

    await supabase.from('events').update({ completed: !currentCompleted }).eq('id', id);
  };

  // Usuwanie po potwierdzeniu w modalu
  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    const id = eventToDelete.id;
    
    setEvents((prev) => prev.filter((item) => item.id !== id));
    setEventToDelete(null);
    
    await supabase.from('events').delete().eq('id', id);
  };

  // Filtrowanie zadań (jeśli selectedDate jest null, pokazuje WSZYSTKIE)
  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => {
        const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || ev.category === filterCategory;
        const matchesDate = !selectedDate || ev.date === selectedDate;
        return matchesSearch && matchesCategory && matchesDate;
      })
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return timeA - timeB;
      });
  }, [events, searchQuery, filterCategory, selectedDate]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CategoryKey[]> = {};
    events.forEach((ev) => {
      if (!map[ev.date]) map[ev.date] = [];
      if (!map[ev.date].includes(ev.category)) {
        map[ev.date].push(ev.category);
      }
    });
    return map;
  }, [events]);

  const calculateDaysLeft = (dateStr: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Po terminie';
    if (diffDays === 0) return 'Dzisiaj!';
    if (diffDays === 1) return 'Jutro';
    return `Za ${diffDays} dni`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white flex flex-col justify-between pb-10">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950 pointer-events-none -z-10" />

      {/* Nagłówek */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 transition-all">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20 animate-pulse">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Planer Zadań i Kalendarz
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">Zintegrowany z Supabase</p>
            </div>
          </div>

          <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span>Dzisiaj: <strong className="text-purple-400">{getTodayString()}</strong></span>
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
          </div>
        </div>
      </header>

      {/* Główna Zawartość */}
      <main className="max-w-7xl mx-auto px-4 pt-6 flex-1 flex flex-col justify-between w-full">
        <div ref={mainGridRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-8">
          
          {/* LEWA STRONA: Kalendarz */}
          <section className="lg:col-span-5 bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col justify-between transition-all hover:border-slate-700/80">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-purple-400" />
                  <h2 className="font-semibold text-slate-200 capitalize">
                    {currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 mb-2">
                <span>Pn</span><span>Wt</span><span>Śr</span><span>Cz</span><span>Pt</span><span>So</span><span>Nd</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map(({ dateStr, dayNumber, isCurrentMonth }) => {
                  const dayCategories = eventsByDate[dateStr] || [];
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === getTodayString();

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
                      className={`
                        relative min-h-[52px] flex flex-col items-center justify-between p-1.5 rounded-xl text-xs transition-all duration-200 cursor-pointer
                        ${!isCurrentMonth ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:bg-slate-800/80'}
                        ${isToday ? 'border border-purple-500/80 font-bold text-purple-300 bg-purple-950/20' : ''}
                        ${isSelected ? 'bg-purple-600/30 text-white border-2 border-purple-400 shadow-lg shadow-purple-500/20 scale-105 z-10' : ''}
                      `}
                    >
                      <span>{dayNumber}</span>
                      <div className="flex gap-1 items-center justify-center min-h-[12px] w-full">
                        {dayCategories.slice(0, 3).map((cat: CategoryKey, idx: number) => (
                          <span
                            key={idx}
                            className={`w-2.5 h-2.5 rounded-full shadow-md transition-all ${CATEGORIES[cat]?.color || 'bg-slate-400'} animate-in fade-in duration-300`}
                            title={CATEGORIES[cat]?.name}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Wybrany dzień: <strong className="text-purple-300">{selectedDate ? selectedDate : 'Wszystkie'}</strong></span>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-purple-400 hover:text-purple-300 hover:underline transition-colors"
                >
                  Pokaż wszystkie
                </button>
              )}
            </div>
          </section>

          {/* PRAWA STRONA: Lista Wydarzeń */}
          <section className="lg:col-span-7 bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col justify-between transition-all hover:border-slate-700/80 h-full">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-semibold text-slate-200">
                    {selectedDate ? `Zadania na dzień ${selectedDate}` : 'Wszystkie Zadania (Chronologicznie)'}
                  </h2>
                </div>
                <span className="text-xs text-slate-500">{filteredEvents.length} zadań</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Szukaj zadania..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>

                <select
                  value={filterCategory}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCategory(e.target.value)}
                  className="bg-slate-950/60 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500/50 transition-colors"
                >
                  <option value="all">Wszystkie kategorie</option>
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
                {isLoading ? (
                  <div className="text-center py-16 text-slate-500 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span>Ładowanie zadań z bazy Supabase...</span>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs flex flex-col items-center gap-2 animate-in fade-in">
                    <CalendarDays className="w-8 h-8 text-slate-700" />
                    <span>Brak wydarzeń dla wybranego filtra.</span>
                  </div>
                ) : (
                  filteredEvents.map((ev: EventItem) => {
                    const cat = CATEGORIES[ev.category as CategoryKey] || CATEGORIES.inne;
                    const daysLeft = calculateDaysLeft(ev.date);

                    return (
                      <div
                        key={ev.id}
                        className={`
                          group flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all duration-200 hover:scale-[1.01]
                          ${ev.completed ? 'bg-slate-950/40 border-slate-800/50 opacity-60' : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleComplete(ev.id, ev.completed)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors active:scale-90"
                          >
                            {ev.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`font-medium text-sm transition-colors ${ev.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                {ev.title}
                              </h3>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cat.bgAlpha} ${cat.text} ${cat.border}`}>
                                {cat.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 text-slate-500" />
                                {ev.date}
                              </span>
                              {ev.time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {ev.time}
                                </span>
                              )}
                              <span className="text-purple-400 font-medium">{daysLeft}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setEventToDelete(ev)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all hover:scale-110"
                          title="Usuń zadanie"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>

        {/* PROMPTER  */}
        <div className="w-full max-w-3xl mx-auto mb-15 py-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-md opacity-40 group-hover:opacity-70 transition-all duration-300 animate-pulse" />
            <div className="relative bg-slate-900/95 border border-slate-700/90 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex items-center gap-3 transition-all">
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0 ml-1 animate-spin" />
              <input
                type="text"
                placeholder="Wpisz nowe wydarzenie i naciśnij Enter lub Plus..."
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                onKeyDown={handleKeyDownPrompter}
                className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none"
              />
              <button
                onClick={handleOpenPopup}
                className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-md transition-all shrink-0 cursor-pointer active:scale-95 flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            Wpisz tekst wydarzenia powyżej i naciśnij <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">Enter</kbd>
          </p>
        </div>
      </main>

      {/* POPUP DODAWANIA */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold text-slate-100 text-base">Szczegóły nowego wydarzenia</h3>
              </div>
              <button
                onClick={() => setIsPopupOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Nazwa zadania</label>
              <input
                type="text"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder="Nazwa zadania..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition-colors"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                  Wybierz termin
                </span>
                <span className="text-[11px] text-purple-400 font-semibold">{inputDate}</span>
              </label>

              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setInputDate(getTodayString())}
                  className={`px-2 py-1.5 text-xs rounded-lg border transition-all ${inputDate === getTodayString() ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                >
                  Dzisiaj
                </button>
                <button
                  type="button"
                  onClick={() => setInputDate(addDaysToDate(1))}
                  className={`px-2 py-1.5 text-xs rounded-lg border transition-all ${inputDate === addDaysToDate(1) ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                >
                  Jutro
                </button>
                <button
                  type="button"
                  onClick={() => setInputDate(addDaysToDate(3))}
                  className={`px-2 py-1.5 text-xs rounded-lg border transition-all ${inputDate === addDaysToDate(3) ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                >
                  Za 3 dni
                </button>
                <button
                  type="button"
                  onClick={() => setInputDate(addDaysToDate(7))}
                  className={`px-2 py-1.5 text-xs rounded-lg border transition-all ${inputDate === addDaysToDate(7) ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                >
                  Za tydzień
                </button>
              </div>

              {/* OTWIERANIE KALENDARZA PO KLIKNIĘCIU W POLE */}
              <input
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch (_) {}
                }}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 mt-2 cursor-pointer [color-scheme:dark]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                Kategoria
              </label>
              <select
                value={inputCategory}
                onChange={(e) => setInputCategory(e.target.value as CategoryKey)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 transition-colors"
              >
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasTime}
                    onChange={(e) => setHasTime(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-950"
                  />
                  <span>Dodaj konkretną godzinę</span>
                </label>

                {hasTime && (
                  <input
                    type="time"
                    value={inputTime}
                    onChange={(e) => setInputTime(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.();
                      } catch (_) {}
                    }}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer [color-scheme:dark]"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPopupOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAddEvent()}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                Zapisz wydarzenie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POTWIERDZENIA USUNIĘCIA */}
      {eventToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-100 text-base">Potwierdź usunięcie</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Czy na pewno chcesz usunąć zadanie <strong className="text-white font-semibold">"{eventToDelete.title}"</strong>? Operacji nie będzie można cofnąć.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={confirmDeleteEvent}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Usuń zadanie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}