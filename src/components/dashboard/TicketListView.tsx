import React from 'react';
import { Flag, Clock, User as UserIcon } from 'lucide-react';

import { Ticket } from '@/types/ticket';

export default function TicketListView({ 
  tickets, 
  onTicketClick 
}: { 
  tickets: Ticket[]; 
  onTicketClick: (ticket: Ticket) => void;
}) {
  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50/50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
            <tr>
              <th className="px-6 py-4 w-1/2">Task Name</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Assignee</th>
              <th className="px-6 py-4">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No tasks found in this project.
                </td>
              </tr>
            ) : null}
            {tickets.map((ticket) => (
              <tr 
                key={ticket.id} 
                onClick={() => onTicketClick(ticket)}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
              >
                <td className="px-6 py-4 font-medium text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    ticket.status === 'done' || ticket.status === 'deployed' 
                      ? 'bg-green-500' 
                      : ticket.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                  <span className="line-clamp-1">{ticket.title}</span>
                </td>
                
                <td className="px-6 py-4">
                  <span className="capitalize px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold whitespace-nowrap">
                    {ticket.status.replace('_', ' ')}
                  </span>
                </td>

                <td className="px-6 py-4">
                  {ticket.priority === 'urgent' && <span className="flex items-center gap-1.5 text-xs font-bold text-red-600"><Flag className="w-3.5 h-3.5" /> Urgent</span>}
                  {ticket.priority === 'high' && <span className="flex items-center gap-1.5 text-xs font-bold text-orange-600"><Flag className="w-3.5 h-3.5" /> High</span>}
                  {ticket.priority === 'normal' && <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600"><Flag className="w-3.5 h-3.5" /> Normal</span>}
                  {ticket.priority === 'low' && <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500"><Flag className="w-3.5 h-3.5 outline-none" /> Low</span>}
                </td>

                <td className="px-6 py-4">
                  {ticket.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                        {(ticket.assignee.name || ticket.assignee.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium truncate max-w-[120px]">
                        {ticket.assignee.name || ticket.assignee.email?.split('@')[0]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 border border-dashed rounded-full" /> Unassigned
                    </span>
                  )}
                </td>

                <td className="px-6 py-4">
                  {ticket.dueDate ? (
                    <span className={`text-xs font-medium flex items-center gap-1.5 ${
                      new Date(ticket.dueDate) < new Date() ? 'text-red-500' : 'text-gray-600'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ticket.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
