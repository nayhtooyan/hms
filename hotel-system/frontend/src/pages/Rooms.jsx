import { useEffect, useState } from "react";
import api from "../api";
import { useToast } from "../components/ToastContext";
import Modal from "../components/Modal";
import { Plus, Search, Home, Pencil, Trash2, Loader2 } from "lucide-react";

export default function Rooms() {
  const { addToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: "",
    floor: "1",
    roomType: "Standard",
    basePrice: "",
    extraBedPrice: "0",
    overtimeHourlyRate: "0",
  });

  const loadRooms = async () => {
    try {
      const response = await api.get("/rooms");
      setRooms(response.data);
    } catch (error) {
      addToast("Failed to load rooms", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleOpenModal = (room = null) => {
    setEditingRoom(room);
    if (room) {
      setFormData({
        roomNumber: room.roomNumber,
        floor: room.floor,
        roomType: room.roomType,
        basePrice: room.basePrice,
        extraBedPrice: room.extraBedPrice,
        overtimeHourlyRate: room.overtimeHourlyRate,
      });
    } else {
      setFormData({
        roomNumber: "",
        floor: "1",
        roomType: "Standard",
        basePrice: "",
        extraBedPrice: "0",
        overtimeHourlyRate: "0",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        floor: Number(formData.floor),
        basePrice: Number(formData.basePrice),
        extraBedPrice: Number(formData.extraBedPrice),
        overtimeHourlyRate: Number(formData.overtimeHourlyRate),
      };

      if (editingRoom) {
        await api.patch(`/rooms/${editingRoom._id}`, payload);
        addToast("Room updated successfully");
      } else {
        await api.post("/rooms", payload);
        addToast("Room created successfully");
      }
      setIsModalOpen(false);
      loadRooms();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to save room", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to disable this room?")) return;
    try {
      await api.delete(`/rooms/${id}`);
      addToast("Room disabled");
      loadRooms();
    } catch (error) {
      addToast("Failed to disable room", "error");
    }
  };

  const filteredRooms = rooms.filter(room => 
    room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.roomType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    available: "bg-emerald-100 text-emerald-700",
    occupied: "bg-red-100 text-red-700",
    reserved: "bg-blue-100 text-blue-700",
    cleaning: "bg-amber-100 text-amber-700",
    maintenance: "bg-orange-100 text-orange-700",
    blocked: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rooms Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your hotel rooms, pricing, and status.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> Add New Room
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by room number or type..." 
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading rooms...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Floor</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price / Night</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRooms.map((room) => (
                  <tr key={room._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <Home className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-900">{room.roomNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{room.roomType}</td>
                    <td className="px-6 py-4 text-gray-600">{room.floor}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">${room.basePrice}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${statusColors[room.status] || "bg-gray-100 text-gray-600"}`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(room)}
                          className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(room._id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRooms.length === 0 && (
              <div className="text-center py-16 text-gray-400">No rooms found.</div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Room Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingRoom ? "Edit Room" : "Add New Room"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label-primary">Room Number</label>
              <input 
                type="text" 
                className="input-primary" 
                value={formData.roomNumber} 
                onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="label-primary">Room Type</label>
              <input 
                type="text" 
                className="input-primary" 
                value={formData.roomType} 
                onChange={(e) => setFormData({...formData, roomType: e.target.value})}
              />
            </div>
            <div>
              <label className="label-primary">Floor</label>
              <input 
                type="number" 
                className="input-primary" 
                value={formData.floor} 
                onChange={(e) => setFormData({...formData, floor: e.target.value})}
              />
            </div>
            <div>
              <label className="label-primary">Base Price ($)</label>
              <input 
                type="number" 
                className="input-primary" 
                value={formData.basePrice} 
                onChange={(e) => setFormData({...formData, basePrice: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="label-primary">Extra Bed Price</label>
              <input 
                type="number" 
                className="input-primary" 
                value={formData.extraBedPrice} 
                onChange={(e) => setFormData({...formData, extraBedPrice: e.target.value})}
              />
            </div>
            <div>
              <label className="label-primary">Overtime Rate (Hr)</label>
              <input 
                type="number" 
                className="input-primary" 
                value={formData.overtimeHourlyRate} 
                onChange={(e) => setFormData({...formData, overtimeHourlyRate: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
            >
              {editingRoom ? "Save Changes" : "Create Room"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}