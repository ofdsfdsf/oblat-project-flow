
import React, { useMemo } from 'react';
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { format, addDays, startOfDay, endOfDay, endOfMonth, differenceInDays, isBefore, isAfter, subDays } from 'date-fns';
import { formatDatePl } from "@/lib/date-utils";
import { Task } from "@/services/taskService";
import { CalendarClock } from 'lucide-react';

interface TaskTimeAxisProps {
  tasks: Task[];
}

const TaskTimeAxis = ({ tasks }: TaskTimeAxisProps) => {
  const timeAxisData = useMemo(() => {
    if (!tasks.length) return [];

    const today = startOfDay(new Date());
    const pastDate = subDays(today, 30); // Show tasks from the past 30 days
    const endDate = endOfMonth(addDays(today, 60)); // Show up to 2 months in the future

    // Get tasks with due dates
    const tasksWithDueDates = tasks
      .filter(task => task.due_date)
      .map(task => ({
        ...task,
        dueDate: new Date(task.due_date as string),
        completed: task.status === 'done'
      }))
      .filter(task => isAfter(task.dueDate, pastDate)) // Only include tasks with due dates after pastDate
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    if (!tasksWithDueDates.length) return [];

    // Create data for tasks as time ranges
    const taskRanges = tasksWithDueDates.map((task) => {
      const isPast = isBefore(task.dueDate, today);
      return {
        id: task.id,
        title: task.title,
        startDate: isPast ? task.dueDate : today, // For past tasks, start from due date
        endDate: isPast ? today : task.dueDate, // For past tasks, end at today
        dueDate: task.dueDate,
        isPast,
        isCompleted: task.completed,
        status: task.status
      };
    });

    // Create the timeline data
    const timelineData = [];
    
    // Add task data ranges
    taskRanges.forEach((task, index) => {
      timelineData.push({
        id: task.id,
        title: task.title,
        startDate: task.startDate.getTime(),
        endDate: task.endDate.getTime(),
        type: 'task',
        status: task.status,
        isPast: task.isPast,
        isCompleted: task.isCompleted,
        label: task.title,
        position: index // Stacked position for the chart
      });
    });

    return timelineData;
  }, [tasks]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      
      if (data.type === 'task') {
        return (
          <div className="bg-white p-3 border rounded shadow-sm max-w-xs">
            <p className="text-sm font-medium mb-1">{data.title}</p>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Termin:</span>
                <span className="font-medium">{formatDatePl(new Date(data.isPast ? data.startDate : data.endDate), 'PPP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`font-medium ${
                  data.status === 'done' ? 'text-green-600' : 
                  data.status === 'in_progress' ? 'text-purple-600' :
                  'text-amber-600'
                }`}>
                  {data.status === 'done' ? 'Zakończone' : 
                   data.status === 'in_progress' ? 'W trakcie' : 
                   'Do zrobienia'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Czasookres:</span>
                <span className="font-medium">
                  {data.isPast ? 'Zadanie przeszłe' : 'Zadanie przyszłe'}
                </span>
              </div>
            </div>
          </div>
        );
      }
    }
    return null;
  };

  const getBarColor = (entry: any) => {
    if (entry.isCompleted) return '#10b981'; // Green for completed
    if (entry.isPast) return '#ef4444'; // Red for past due
    return '#10b981'; // Green for upcoming
  };

  if (!timeAxisData.length) {
    return null;
  }

  return (
    <div className="bg-white border rounded-lg p-4 mb-8 mt-8">
      <div className="flex items-center mb-4">
        <CalendarClock className="h-5 w-5 text-purple-600 mr-2" />
        <h3 className="text-lg font-medium text-gray-700">Oś czasu zadań</h3>
      </div>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={timeAxisData}
            layout="horizontal"
            margin={{ top: 30, right: 30, left: 30, bottom: 20 }}
            barSize={20}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              type="number" 
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => {
                const date = new Date(value);
                return format(date, 'd MMM');
              }}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis 
              type="category"
              dataKey="title"
              width={150}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                // Limit length of task titles
                return value?.length > 20 ? value.substr(0, 18) + '...' : value;
              }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              x={new Date().getTime()} 
              stroke="#8B5CF6" 
              strokeWidth={2}
              label={{ 
                value: "Dzisiaj",
                position: "top",
                fill: "#8B5CF6",
                fontSize: 12,
                fontWeight: "bold"
              }}
            />
            <Bar 
              dataKey={(entry) => entry.endDate - entry.startDate} 
              name="Duration" 
              stackId="a"
              minPointSize={2}
              background={false}
            >
              {timeAxisData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={getBarColor(entry)}
                  radius={4}
                  x={entry.startDate}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TaskTimeAxis;
