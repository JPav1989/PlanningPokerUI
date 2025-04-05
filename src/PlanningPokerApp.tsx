import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Users,
    LogIn,
    LogOut,
    RotateCw,
    CheckCircle,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils"
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';


// --- Constants ---
const API_BASE_URL = 'https://localhost:7273/api/PlanningPoker';
//const API_BASE_URL = 'https://planningpokerapi-gma9accfbhasc9ae.ukwest-01.azurewebsites.net/api/PlanningPoker';
const FIBONACCI_NUMBERS = ['0', '1', '2', '3', '5', '8', '13', '21', '?' ];

const createRoom = async (roomId: string): Promise<string> => {
    console.log(`Calling API to create/ensure room: ${roomId}`);
    const response = await fetch(`${API_BASE_URL}/AddRoom/${roomId}`, { method: 'POST' });
    if (!response.ok) {        
        let errorDetail = `HTTP ${response.status} ${response.statusText}`;
         try {
             const errorData = await response.json();
             if (errorData && errorData.detail) errorDetail += ` - ${errorData.detail}`;
             else if (errorData && errorData.title) errorDetail += ` - ${errorData.title}`; 
         } catch (parseError) { 
            throw new Error(`Failed to create room: ${errorDetail}`)
    };
    }
    
    const data = await response.json();
    if (!data || typeof data.id !== 'string') {
         console.warn("API AddRoom did not return an object with a string 'id'. Using provided ID.");
         return roomId; 
     }
    console.log("API AddRoom successful, returned ID:", data.id);
    return data.id; 
};


const addUserToRoom = async (roomId: string, userName: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/${roomId}/AddUser/${userName}`, { method: 'POST' });
    if (!response.ok) {
        const errorData = await response.json(); 
        let errorMessage = `Failed to add user: ${response.status} ${response.statusText}`;
        if (errorData && errorData.detail) { 
            errorMessage += ` - ${errorData.detail}`;
        }
        throw new Error(errorMessage);
    }
    const data = await response.json();
    return data;
};

interface User {
    id: string;
    name: string;
    vote: string | null;
}

interface Room {
    id: string;
    users: Record<string, User>;
}

const UserCard = ({ user, isCurrent, showVotes }: { user: User; isCurrent: boolean; showVotes: boolean }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="w-full"
        >
            <Card
                className={cn(
                    "flex flex-col items-center justify-center p-4",
                    "transition-all duration-300",
                    "border-2",
                    isCurrent ? "border-blue-500 bg-blue-500/10" : "border-gray-700 bg-gray-800/50",
                    "text-white",
                    "min-h-[120px]" 
                )}
            >
                <CardHeader className="flex flex-col items-center justify-center space-y-1">
                    <User className="w-6 h-6" />
                    <CardTitle className="text-sm font-semibold text-center">{user.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                    {showVotes ? (
                        <div className={cn(
                            "text-xl font-bold",
                            user.vote === null ? "text-gray-400" : "text-white"
                        )}>
                            {user.vote ?? '-'}
                        </div>
                    ) : (                        
                        user.vote !== null ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                            <div className="text-xl font-bold text-gray-400">-</div>
                        )
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

const VoteSelector = ({ onVote, selectedVote, isVoting }: { onVote: (vote: string) => void; selectedVote: string | null; isVoting: boolean }) => {
    return (
        <div className="flex flex-wrap justify-center gap-2">
            {FIBONACCI_NUMBERS.map((number) => (
                <Button
                    key={number}
                    variant="outline"
                    onClick={() => onVote(number)}
                    className={cn(
                        "w-16 h-12 text-lg font-bold",
                        "transition-colors duration-200",
                        selectedVote === number
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-gray-800 text-white hover:bg-gray-700 border-gray-700 hover:border-gray-600",
                        !isVoting && "opacity-50 cursor-not-allowed" 
                    )}
                    disabled={!isVoting}
                >
                    {number}
                </Button>
            ))}
        </div>
    );
};

const CreateJoinRoomPage = ({ onJoinRoom }: { onJoinRoom: (roomId: string, userName: string) => void }) => { 
    const [roomId, setRoomId] = useState<string>(''); 
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleJoin = async () => {
        setError(null); 
        if (!userName.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!roomId.trim()) {
            setError('Please enter a Room ID');
            return;
        }

        setLoading(true);
        try {
            onJoinRoom(roomId.trim(), userName.trim());
        } catch (err: any) {
            setError(err.message || 'Failed to join/create room');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <h2 className="text-2xl font-semibold">Create or Join Room</h2>
            <Input
                type="text"
                placeholder="Your Name (Required)"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                required 
            />
            <Input
                type="text"
                placeholder="Room ID (Required)"
                value={roomId} 
                onChange={(e) => setRoomId(e.target.value)} 
                className="bg-gray-800 border-gray-700 text-white"
                required 
            />
            <Button
                onClick={handleJoin}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Entering Room... 
                    </>
                ) : (
                    <>
                        <LogIn className="w-5 h-5 mr-2" />
                        Enter Room 
                    </>
                )}
            </Button>
            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-md flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {error}
                </div>
            )}
        </div>
    );
};

const PlanningPokerPage = ({ room, currentUserId, onClearVotes, onRevealVotes, onVote, selectedVote, showVotes, isVoting, onLeaveRoom }: {
    room: Room;
    currentUserId: string;
    onClearVotes: () => void;
    onRevealVotes: () => void;
    onVote: (vote: string) => void;
    selectedVote: string | null;
    showVotes: boolean
    isVoting: boolean;
    onLeaveRoom: () => void;
}) => {      
    if (!room) {
        return (
            <div className="text-center text-white">
                <p>Error: No room data available.</p>
                <Button onClick={onLeaveRoom} className="mt-4">
                    Return to Join/Create
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">            
            <div className="flex justify-between items-center">                
                <div className="relative flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Room: {room.id}
                    </h2>                    
                </div>

                <Button
                    onClick={onLeaveRoom}
                    className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
                >
                    <LogOut className="w-5 h-5 mr-2" />
                    Leave Room
                </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <AnimatePresence>
                    {Object.values(room?.users ?? {}).map((user) => (
                        <UserCard
                            key={user.id}
                            user={user}
                            isCurrent={user.id === currentUserId}
                            showVotes={showVotes} 
                        />
                    ))}
                </AnimatePresence>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
                <Button  
                    onClick={onRevealVotes} 
                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300"
                    disabled={Object.values(room.users).every(u => u.vote === null)} 
                >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {showVotes ? "Hide Votes" : "Reveal Votes"}
                </Button>
                <Button
                    onClick={() => {
                        onClearVotes();  
                    }}
                    className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 hover:text-yellow-300"
                    disabled={Object.values(room.users).every(u => u.vote === null)} 
                >
                    <RotateCw className="w-5 h-5 mr-2" />
                    Clear All Votes / New Round
                </Button>
            </div>

            <VoteSelector onVote={onVote} selectedVote={selectedVote} isVoting={isVoting} />
        </div>
    );
};

// Main App Component
const PlanningPokerApp = () => {
    const [currentPage, setCurrentPage] = useState<'createJoin' | 'planningPoker'>('createJoin');
    const [roomId, setRoomId] = useState<string | null>(null); 
    const [user, setUser] = useState<User | null>(null);
    const [room, setRoom] = useState<Room | null>(null);
    const [hubConnection, setHubConnection] = useState<any | null>(null);
    const [selectedVote, setSelectedVote] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isVoting, setIsVoting] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showVotesState, setShowVotesState] = useState(false);

    const setupSignalR = useCallback(async (currentRoomId: string, currentUser: User) => {
        console.log("Setting up SignalR for room:", currentRoomId);
        if (hubConnection) {
             console.log("SignalR connection already exists.");
             return;
        }
        try {
            const connection = new HubConnectionBuilder()
                .withUrl(`${API_BASE_URL.replace('/api/PlanningPoker', '')}/planningpokerhub`)
                .configureLogging(LogLevel.Information)
                .withAutomaticReconnect()
                .build();
            
            connection.on('UserJoined', (updatedRoomData: Room, joinedUserName: string) => {
                console.log(`SignalR: UserJoined event received for ${joinedUserName}`, updatedRoomData);
                setRoom(prev => {
                    if (!prev) return updatedRoomData;
                    const correctRoomId = prev.id; 
                    const incomingUsers = updatedRoomData.users || {};
                    const mergedUsers = { ...prev.users, ...incomingUsers };
                    return { ...prev, ...updatedRoomData, id: correctRoomId, users: mergedUsers };
                });                 
                setError(null);
            });

            connection.on('UserLeft', (userId: string, leftUserName: string) => {
                console.log(`SignalR: UserLeft event received for ${leftUserName} (ID: ${userId})`);
                setRoom(prev => {
                    if (!prev) return null;
                    const remainingUsers = { ...prev.users };
                    delete remainingUsers[userId];
                    return { ...prev, users: remainingUsers };
                });
            });

            connection.on('VoteReceived', (userId: string, vote: string) => {
                console.log(`SignalR: VoteReceived from ${userId}: ${vote}`);
                setRoom(prevRoom => {
                    if (!prevRoom) return null;
                    const updatedUsers = { ...prevRoom.users };
                    const userToUpdate = updatedUsers[userId];
                    if (userToUpdate) {
                        updatedUsers[userId] = { ...userToUpdate, vote };
                    } else {
                        console.warn(`Vote received for unknown user ID: ${userId}`);
                    }
                    return { ...prevRoom, users: updatedUsers };
                });
                setError(null);
            });

            connection.on('VotesRevealed', () => {                                
                setIsVoting(false); 
                setShowVotesState(!showVotesState);
                setError(null);                 
            });

            connection.on('AllVotesCleared', () => {
                console.log("SignalR: AllVotesCleared event received");                                
                setRoom(prevRoom => {
                    if (!prevRoom) return null;
                    const updatedUsers: Record<string, User> = {};
                    for (const userId in prevRoom.users) {
                        if (prevRoom.users.hasOwnProperty(userId)) {
                            updatedUsers[userId] = { ...prevRoom.users[userId], vote: null };
                        }
                    }
                    return { ...prevRoom, users: updatedUsers };
                });
                setSelectedVote(null);
                setIsVoting(true); 
                setShowVotesState(false);
                setError(null);
            });

             connection.onclose((error) => {
                 console.log('SignalR connection closed.', error);
                 setError('Connection lost. Attempting to reconnect...');
                 setHubConnection(null); 
             });
             connection.onreconnecting((error) => {
                 console.log('SignalR reconnecting...', error);
                 setError('Connection lost. Attempting to reconnect...');
             });
             connection.onreconnected(async (connectionId) => {
                 console.log('SignalR reconnected!', connectionId);
                 setError(null);
                 setHubConnection(connection); 
                 if (roomId && user) { 
                     console.log("Attempting to re-join room after reconnect...");
                     try {
                         await connection.invoke("JoinRoom", roomId, user);
                         console.log("Successfully re-joined room after reconnect.");                         
                     } catch (err) {
                         console.error("Failed to re-join room after reconnect:", err);
                         setError("Failed to rejoin room after reconnect. Please refresh or leave/rejoin.");                         
                         handleLeaveRoom();
                     }
                 } else {
                     console.warn("Cannot rejoin room after reconnect: roomId or user is missing.");
                     handleLeaveRoom();
                 }
             });

            await connection.start();
            setHubConnection(connection); 
            try {
                await connection.invoke("JoinRoom", currentRoomId, currentUser);
            } catch (err: any) {
                console.error("Error invoking JoinRoom on SignalR hub", err);
                setError("Failed to register with real-time service: " + (err.message || 'Unknown error'));
                connection.stop().catch(e => console.error("Failed to stop connection after JoinRoom error", e));
                setHubConnection(null); 
                throw err;
            }
        } catch (err: any) {
            console.error('SignalR connection failed to start:', err);
            setError(`Failed to connect to real-time service: ${err.message || 'Unknown error'}`);
            setHubConnection(null); 
             throw err; 
        }
    }, [hubConnection, roomId, user]); 

    const fetchRoomData = async (roomIdToFetch: string): Promise<Room> => {
        try {
            const response = await fetch(`${API_BASE_URL}/${roomIdToFetch}`);
            if (!response.ok) {
                let errorDetail = `HTTP ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.detail) errorDetail += ` - ${errorData.detail}`;
                    else if (errorData && errorData.title) errorDetail += ` - ${errorData.title}`;
                } catch (parseError) { /* Ignore */ }
                throw new Error(`Failed to fetch room data: ${errorDetail}`);
            }
            const data: Room = await response.json();
            console.log("Fetched room data:", data);
            data.users = data.users || {};
            return data;
        } catch (error) {
            console.error("Error fetching room data:", error);
            throw error; 
        }
    };

    const handleJoinRoom = async (newRoomId: string, newUserName: string) => { 
        setIsLoading(true);        
        setError(null);

        try {
            const confirmedRoomId = await createRoom(newRoomId);
            setRoomId(confirmedRoomId); 
            const newUser = await addUserToRoom(confirmedRoomId, newUserName);
            setUser(newUser); 

            const fetchedRoom = await fetchRoomData(confirmedRoomId);
            fetchedRoom.users[newUser.id] = newUser;
            setRoom(fetchedRoom); 
            await setupSignalR(confirmedRoomId, newUser);
             setCurrentPage('planningPoker'); 

        } catch (err: any) {
            console.error('Failed to create/join room:', err);
            const message = error || err.message || 'An unknown error occurred during room creation/join.';
            setError(message);
            setRoomId(null); 
            setUser(null);
            setRoom(null);
            if (hubConnection) { 
                hubConnection.stop().catch(e => console.error("Error stopping connection after join failure", e));
                setHubConnection(null);
            }
        } finally {
            setIsLoading(false); 
        }
    };

    const handleVote = async (vote: string) => {
        if (!roomId || !user || !hubConnection || !isVoting) {             
             return;
        }        
        setSelectedVote(vote); 
        try {
            await hubConnection.invoke("SendVote", roomId, user.id, vote);
        } catch (err: any) {
            console.error('Failed to send vote via SignalR:', err);
            setError(err.message || 'Failed to send vote');
            setSelectedVote(null); 
        }
    };

    const handleClearVotes = async () => {
        if (!roomId || !hubConnection) return;
        try {
            await hubConnection.invoke("ClearAllVotes", roomId);
        } catch (err: any) {
            setError(err.message || "Failed to clear votes");
        }
    };

    const handleRevealVotes = useCallback(async () => {
        if (hubConnection) {
            await hubConnection.invoke("RevealVotes", roomId);
            console.log(`show vote state = ${showVotesState}`)
          }
        }, [hubConnection, roomId]);

    const handleLeaveRoom = useCallback(async () => {
        console.log("Leaving room...");
        setIsLoading(true); 
        if (hubConnection) {
            try {                
                if (roomId && user) {
                    await hubConnection.invoke("LeaveRoom", roomId, user.id); 
                    console.log("LeaveRoom invoked on hub.");
                }
                await hubConnection.stop();                
            } catch (err) {
                console.error("Error during SignalR leave/stop:", err);
            } finally {
                 setHubConnection(null); 
            }
        }

        setRoomId(null);
        setUser(null);
        setRoom(null);
        setSelectedVote(null);
        setError(null);
        setIsVoting(true); 
        setCurrentPage('createJoin');
        setIsLoading(false);
    }, [hubConnection, roomId, user]);

    useEffect(() => {
        const connection = hubConnection;
        return () => {
            if (connection) {
                connection.stop().catch(err => console.error("Error stopping connection on unmount:", err));
            }
        };
    }, [hubConnection]); 

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            <header className="py-4 px-6 border-b border-gray-800 shadow-md">
                <h1 className="text-3xl font-bold text-center">Planning Poker</h1>
            </header>

            <main className="flex-1 p-6 container mx-auto max-w-6xl">
                 {error && (
                     <div className="mb-4 bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-md flex items-center gap-2 justify-center">
                         <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                         <span className="text-sm">{error}</span>
                         <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-white">Dismiss</Button>
                     </div>
                 )}

                 {isLoading && (
                     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                         <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                     </div>
                 )}

                {currentPage === 'createJoin' ? (
                <CreateJoinRoomPage onJoinRoom={handleJoinRoom} />
            ) : room && user ? (                 
                    <PlanningPokerPage
                        room={room}
                        currentUserId={user.id}
                        onClearVotes={handleClearVotes}
                        onRevealVotes={handleRevealVotes} 
                        onVote={handleVote}
                        selectedVote={selectedVote}
                        showVotes={showVotesState}
                        isVoting={isVoting}
                        onLeaveRoom={handleLeaveRoom}
                        />
                    ) : (                         
                         !isLoading && <div>Loading room data...</div> 
                     )}

                 {currentPage === 'planningPoker' && (!room || !user) && !isLoading && (
                      <div className="text-center text-gray-400 mt-10">
                         <p className="mb-4">Waiting for room data or experiencing connection issues...</p>
                         <Button onClick={handleLeaveRoom} variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-700">
                             <LogOut className="w-4 h-4 mr-2" /> Return to Join Page
                         </Button>
                     </div>
                 )}
            </main>

             <footer className="py-2 px-6 border-t border-gray-800 text-center text-xs text-gray-500">
                 Planning Poker App - {new Date().getFullYear()}
             </footer>
        </div>
    );
};

export default PlanningPokerApp;