
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LayoutDashboard, Plus, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getTaskStats, getTasks, Task, createTask } from "@/services/taskService";
import { getBugStats, getBugs, Bug } from "@/services/bugService";
import { getProjectProgress } from "@/services/projectService";
import { formatDistancePl, formatDatePl } from "@/lib/date-utils";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AppNavigation from "@/components/AppNavigation";
import { useNavigate } from "react-router-dom";
import TaskDialog from "@/components/tasks/TaskDialog";
import { Progress } from "@/components/ui/progress";
import TaskTimeAxis from "@/components/dashboard/TaskTimeAxis";

const Index = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [taskStats, setTaskStats] = useState({ total: "0", todo: "0", inProgress: "0", done: "0" });
  const [bugStats, setBugStats] = useState({ total: "0", critical: "0", medium: "0", low: "0" });
  const [projectProgress, setProjectProgress] = useState({ progress: "0", plannedEndDate: "" });
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [recentBugs, setRecentBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all data in parallel
      const [
        taskStatsData,
        bugStatsData,
        progressData,
        tasksData,
        bugsData
      ] = await Promise.all([
        getTaskStats(),
        getBugStats(),
        getProjectProgress(),
        getTasks(),
        getBugs()
      ]);
      
      setTaskStats(taskStatsData);
      setBugStats(bugStatsData);
      setProjectProgress({
        progress: progressData.progress,
        plannedEndDate: progressData.plannedEndDate
      });
      
      // Store all tasks for the timeline
      setAllTasks(tasksData);
      
      // Get only the upcoming tasks (not done)
      setUpcomingTasks(tasksData.filter(task => task.status !== 'done').slice(0, 4));
      
      // Get recent bugs
      setRecentBugs(bugsData.slice(0, 4));
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać danych z serwera",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusClass = (dueDate: string | undefined) => {
    if (!dueDate) return "text-gray-500";
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "text-red-500";
    if (diffDays <= 2) return "text-red-500";
    if (diffDays <= 7) return "text-amber-500";
    return "text-gray-500";
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'planned':
        return 'bg-amber-100 text-amber-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRelativeDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    return formatDistancePl(date);
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'pm': return 'Project Manager';
      case 'developer': return 'Programista';
      case 'tester': return 'Tester';
      case 'analyst': return 'Analityk';
      default: return 'Użytkownik';
    }
  };

  const canAddTask = profile?.role === 'pm';
  
  const handleAddTaskClick = () => {
    setTaskDialogOpen(true);
  };

  const handleTaskCreated = (task: Task) => {
    // Update both task lists
    setAllTasks(prev => [task, ...prev]);
    setUpcomingTasks(prev => [task, ...prev].slice(0, 4));
    setTaskDialogOpen(false);
    
    // Recalculate task stats
    const newTotal = (parseInt(taskStats.total) + 1).toString();
    const newTodo = task.status === 'todo' ? (parseInt(taskStats.todo) + 1).toString() : taskStats.todo;
    const newInProgress = task.status === 'in_progress' ? (parseInt(taskStats.inProgress) + 1).toString() : taskStats.inProgress;
    
    setTaskStats({
      ...taskStats,
      total: newTotal,
      todo: newTodo,
      inProgress: newInProgress
    });
    
    toast({
      title: "Zadanie utworzone",
      description: "Nowe zadanie zostało dodane do projektu.",
    });
  };

  const handleViewAllTasks = () => {
    navigate("/task-list");
  };
  
  const handleViewAllBugs = () => {
    navigate("/bugs");
  };

  return (
    <div className="page-container bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-bold text-gray-900">Testowanie aplikacji finansów Oblatów</h1>
          </div>
          <AppNavigation />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard projektu</h2>
          {profile && (
            <div className="flex items-center gap-2">
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleAddTaskClick}>
                <Plus className="mr-1 h-4 w-4" />
                Nowe zadanie
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium text-gray-700">Zadania</CardTitle>
                  <CardDescription>Przegląd zadań projektu</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 mb-2">{taskStats.total}</div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-gray-500">Do zrobienia</span>
                      <span className="font-medium">{taskStats.todo}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500">W trakcie</span>
                      <span className="font-medium">{taskStats.inProgress}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500">Zakończone</span>
                      <span className="font-medium">{taskStats.done}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium text-gray-700">Błędy</CardTitle>
                  <CardDescription>Zgłoszone błędy aplikacji</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500 mb-2">{bugStats.total}</div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-gray-500">Krytyczne</span>
                      <span className="font-medium">{bugStats.critical}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500">Średnie</span>
                      <span className="font-medium">{bugStats.medium}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500">Niskie</span>
                      <span className="font-medium">{bugStats.low}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium text-gray-700">Postęp projektu</CardTitle>
                  <CardDescription>Stan realizacji projektu</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-2">{projectProgress.progress}%</div>
                  <div className="mb-2">
                    <Progress value={parseInt(projectProgress.progress)} className="h-2" />
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    Planowana data zakończenia: {projectProgress.plannedEndDate}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tasks and Bugs Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Nadchodzące zadania</CardTitle>
                  <CardDescription>Zadania z najbliższymi terminami</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingTasks.length > 0 ? (
                    upcomingTasks.map((task) => (
                      <div key={task.id}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-gray-500">
                              Przypisane: {task.assigned_to || "Nieprzypisane"}
                            </div>
                          </div>
                          <div className={`text-sm ${getStatusClass(task.due_date)}`}>
                            {task.due_date ? formatRelativeDate(task.due_date) : "Brak terminu"}
                          </div>
                        </div>
                        <Separator className="my-3" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <AlertCircle className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                      <p>Brak nadchodzących zadań</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={handleViewAllTasks}>
                    Zobacz wszystkie zadania
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ostatnio zgłoszone błędy</CardTitle>
                  <CardDescription>Najnowsze zgłoszenia błędów</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentBugs.length > 0 ? (
                    recentBugs.map((bug) => (
                      <div key={bug.id}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{bug.title}</div>
                            <div className="text-sm">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                                bug.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                bug.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {bug.severity === 'critical' ? 'Krytyczny' :
                                bug.severity === 'medium' ? 'Średni' : 'Niski'}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatRelativeDate(bug.reported_at)}
                          </div>
                        </div>
                        <Separator className="my-3" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <AlertCircle className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                      <p>Brak zgłoszonych błędów</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={handleViewAllBugs}>
                    Zobacz wszystkie błędy
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </>
        )}
      </main>

      <TaskDialog
        open={taskDialogOpen} 
        onClose={() => setTaskDialogOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          © 2025 z dumą wspierani przez marekglowacki.pl
        </div>
      </footer>
    </div>
  );
};

export default Index;
