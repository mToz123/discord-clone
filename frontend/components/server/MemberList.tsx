'use client';

import { useEffect, useState } from 'react';
import { useServerStore } from '@/lib/server';
import { socketClient } from '@/lib/socket';

interface Member {
  id: string;
  username: string;
  avatar_url?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
}

interface MemberListProps {
  serverId: string;
}

export function MemberList({ serverId }: MemberListProps) {
  const { members } = useServerStore();
  const [memberStatus, setMemberStatus] = useState<{ [userId: string]: string }>({});

  useEffect(() => {
    // Initialize status from members
    const statusMap: { [userId: string]: string } = {};
    members.forEach((m: any) => {
      statusMap[m.id] = m.status || 'offline';
    });
    setMemberStatus(statusMap);

    // Listen for presence updates
    const handlePresenceUpdate = (data: { userId: string; status: string }) => {
      setMemberStatus((prev) => ({
        ...prev,
        [data.userId]: data.status,
      }));
    };

    socketClient.getSocket()?.on('presence:update', handlePresenceUpdate);

    return () => {
      socketClient.off('presence:update', handlePresenceUpdate);
    };
  }, [members]);

  // Group members by status
  const onlineMembers = members.filter((m: any) => 
    memberStatus[m.id] === 'online' || memberStatus[m.id] === 'idle' || memberStatus[m.id] === 'dnd'
  );
  const offlineMembers = members.filter((m: any) => 
    memberStatus[m.id] === 'offline' || !memberStatus[m.id]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '●';
      case 'idle': return '○';
      case 'dnd': return '⊝';
      default: return '○';
    }
  };

  const renderMember = (member: any) => {
    const status = memberStatus[member.id] || 'offline';
    
    return (
      <div
        key={member.id}
        className="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-discord-gray/30 cursor-pointer group"
      >
        {/* Avatar with status indicator */}
        <div className="relative flex-shrink-0">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.username}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-discord-blue rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {member.username[0].toUpperCase()}
            </div>
          )}
          {/* Status indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(status)} rounded-full border-2 border-discord-darker`}></div>
        </div>

        {/* Username */}
        <span className="text-sm text-gray-300 group-hover:text-white truncate flex-1">
          {member.username}
        </span>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {/* Online members */}
      {onlineMembers.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase px-2 mb-1">
            Online — {onlineMembers.length}
          </h3>
          <div className="space-y-0.5">
            {onlineMembers.map(renderMember)}
          </div>
        </div>
      )}

      {/* Offline members */}
      {offlineMembers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase px-2 mb-1">
            Offline — {offlineMembers.length}
          </h3>
          <div className="space-y-0.5 opacity-50">
            {offlineMembers.map(renderMember)}
          </div>
        </div>
      )}

      {/* No members */}
      {members.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm">No members yet</div>
        </div>
      )}
    </div>
  );
}
