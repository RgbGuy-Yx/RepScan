import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ActionTask } from '../types/dashboard';

interface ActionBoardViewProps {
  tasks: ActionTask[];
  onUpdateStatus: (taskId: string, newStatus: ActionTask['status']) => void;
  onAddTask: (task: Omit<ActionTask, 'id' | 'createdAt'>) => void;
}

export default function ActionBoardView({
  tasks,
  onUpdateStatus,
  onAddTask,
}: ActionBoardViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newTheme, setNewTheme] = useState('Food Quality');
  const [newPriority, setNewPriority] = useState<ActionTask['priority']>('High');

  const columns: Array<{ id: ActionTask['status']; title: string }> = [
    { id: 'open', title: 'Open Backlog' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'resolved', title: 'Resolved' },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle,
      description: newDesc,
      assignee: newAssignee || 'Operations Team',
      linkedTheme: newTheme,
      priority: newPriority,
      status: 'open',
    });

    setNewTitle('');
    setNewDesc('');
    setNewAssignee('');
    setShowAddModal(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#f7f8f8] tracking-tight">
            Reputation Action Board
          </h2>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Operationalize customer feedback by assigning corrective actions to team leads.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="linear-btn-primary text-xs h-9 px-4 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Action Item</span>
        </button>
      </div>

      {/* 3-Column Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="bg-[#080809] rounded-xl p-3.5 border border-[#23252a] flex flex-col space-y-3 min-h-[480px]">
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#23252a]">
                <span className="text-xs font-medium text-[#f7f8f8]">{col.title}</span>
                <span className="text-xs font-mono font-medium text-[#8a8f98] bg-[#141516] px-2 py-0.5 rounded border border-[#23252a]">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="space-y-3">
                {colTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#62666d] border border-dashed border-[#23252a] rounded-lg">
                    No items in this column.
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg bg-[#0f1011] border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-[#34343a] transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded font-medium text-[10px] uppercase ${
                            task.priority === 'High'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : task.priority === 'Medium'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-[#62666d]">{task.createdAt}</span>
                      </div>

                      <h3 className="text-xs font-medium text-[#f7f8f8] leading-snug">
                        {task.title}
                      </h3>
                      <p className="text-[11.5px] text-[#8a8f98] leading-relaxed">
                        {task.description}
                      </p>

                      <div className="pt-2 border-t border-[#23252a] flex items-center justify-between text-[11px] text-[#62666d]">
                        <span className="text-[#d0d6e0]">{task.assignee}</span>
                        <span className="font-medium text-[#8a8f98]">#{task.linkedTheme}</span>
                      </div>

                      {/* State Shift Buttons */}
                      <div className="pt-2 border-t border-[#23252a]/60 flex items-center justify-end gap-2 text-xs">
                        {col.id !== 'open' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(task.id, 'open')}
                            className="text-[11px] text-[#8a8f98] hover:text-[#f7f8f8] hover:underline"
                          >
                            Move to Open
                          </button>
                        )}
                        {col.id !== 'in_progress' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(task.id, 'in_progress')}
                            className="text-[11px] text-amber-400 hover:text-amber-300 font-medium hover:underline"
                          >
                            Mark In Progress
                          </button>
                        )}
                        {col.id !== 'resolved' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(task.id, 'resolved')}
                            className="text-[11px] text-[#4ade80] hover:text-emerald-300 font-medium hover:underline"
                          >
                            Mark Done ✓
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Action Item Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-[#0f1011] rounded-xl max-w-md w-full p-6 shadow-[0_24px_50px_rgba(0,0,0,0.95),inset_0_1px_0_0_rgba(255,255,255,0.06)] border border-[#23252a] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Create Action Item</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#62666d] hover:text-[#f7f8f8] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-[#d0d6e0] block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Inspect refrigeration temperatures…"
                  className="w-full h-9 px-3 rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder:text-[#62666d] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="font-medium text-[#d0d6e0] block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Context regarding customer complaints or operational instructions…"
                  className="w-full p-2.5 rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder:text-[#62666d] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#d0d6e0] block mb-1">Assignee</label>
                  <input
                    type="text"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    placeholder="e.g. Manager Rohit"
                    className="w-full h-9 px-3 rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder:text-[#62666d] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#d0d6e0] block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as ActionTask['priority'])}
                    className="w-full h-9 px-2.5 rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-[#d0d6e0] block mb-1">Linked Theme</label>
                <select
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
                >
                  <option value="Food Quality">Food Quality</option>
                  <option value="Staff Behaviour">Staff Behaviour</option>
                  <option value="Ambience">Ambience</option>
                  <option value="Value for Money">Value for Money</option>
                  <option value="Cleanliness">Cleanliness</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="linear-btn-secondary text-xs h-8 px-3"
                >
                  Cancel
                </button>
                <button type="submit" className="linear-btn-primary text-xs h-8 px-4">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
