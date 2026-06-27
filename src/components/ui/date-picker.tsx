"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface DatePickerProps {
  date?: Date
  setDate: (date: Date) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ date, setDate, placeholder = "Pick a date", className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "w-full flex items-center justify-start text-left font-normal h-9 border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm text-xs font-mono px-3 cursor-pointer",
          !date && "text-slate-400 dark:text-slate-500",
          className
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
        {date ? format(date, "PPP") : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-lg" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              setDate(d)
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
