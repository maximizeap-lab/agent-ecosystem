/**
 * userSlice.js  (Redux Toolkit)
 * Manages the user list and profile data used by admin and coach dashboards.
 * Authentication state lives in AuthContext; this slice handles the user
 * resource CRUD that admins and coaches perform.
 *
 * Actions exposed:
 *   fetchUsers()
 *   fetchUserById(userId)
 *   createUser(userData)
 *   updateUser({ id, changes })
 *   deleteUser(userId)
 *   assignRole({ userId, role })
 */

import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
} from "@reduxjs/toolkit";
import api from "./authService.js"; // the authenticated axios instance

// ─── Entity Adapter ───────────────────────────────────────────────────────────
// Normalises the users array into an id-indexed map for O(1) lookups.

const usersAdapter = createEntityAdapter({
  selectId: (user) => user.id,
  sortComparer: (a, b) => a.name?.localeCompare(b.name),
});

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchUsers = createAsyncThunk(
  "users/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/users");
      return data.users; // array of user objects
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to fetch users."
      );
    }
  }
);

export const fetchUserById = createAsyncThunk(
  "users/fetchById",
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/users/${userId}`);
      return data.user;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to fetch user."
      );
    }
  }
);

export const createUser = createAsyncThunk(
  "users/create",
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/users", userData);
      return data.user;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to create user."
      );
    }
  }
);

export const updateUser = createAsyncThunk(
  "users/update",
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/users/${id}`, changes);
      return data.user;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to update user."
      );
    }
  }
);

export const deleteUser = createAsyncThunk(
  "users/delete",
  async (userId, { rejectWithValue }) => {
    try {
      await api.delete(`/users/${userId}`);
      return userId;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to delete user."
      );
    }
  }
);

export const assignRole = createAsyncThunk(
  "users/assignRole",
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/users/${userId}/role`, { role });
      return data.user;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error ?? "Failed to assign role."
      );
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const usersSlice = createSlice({
  name: "users",
  initialState: usersAdapter.getInitialState({
    status: "idle",       // 'idle' | 'loading' | 'succeeded' | 'failed'
    actionStatus: "idle", // tracks mutation operations separately
    error: null,
    selectedUserId: null,
  }),
  reducers: {
    setSelectedUser(state, action) {
      state.selectedUserId = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchUsers
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        usersAdapter.setAll(state, action.payload);
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });

    // fetchUserById
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.status = "succeeded";
        usersAdapter.upsertOne(state, action.payload);
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });

    // createUser
    builder
      .addCase(createUser.pending, (state) => {
        state.actionStatus = "loading";
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.actionStatus = "succeeded";
        usersAdapter.addOne(state, action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.actionStatus = "failed";
        state.error = action.payload;
      });

    // updateUser
    builder
      .addCase(updateUser.pending, (state) => {
        state.actionStatus = "loading";
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.actionStatus = "succeeded";
        usersAdapter.upsertOne(state, action.payload);
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.actionStatus = "failed";
        state.error = action.payload;
      });

    // deleteUser
    builder
      .addCase(deleteUser.pending, (state) => {
        state.actionStatus = "loading";
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.actionStatus = "succeeded";
        usersAdapter.removeOne(state, action.payload);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.actionStatus = "failed";
        state.error = action.payload;
      });

    // assignRole
    builder
      .addCase(assignRole.pending, (state) => {
        state.actionStatus = "loading";
      })
      .addCase(assignRole.fulfilled, (state, action) => {
        state.actionStatus = "succeeded";
        usersAdapter.upsertOne(state, action.payload);
      })
      .addCase(assignRole.rejected, (state, action) => {
        state.actionStatus = "failed";
        state.error = action.payload;
      });
  },
});

// ─── Actions ──────────────────────────────────────────────────────────────────

export const { setSelectedUser, clearError } = usersSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
  selectTotal: selectTotalUsers,
} = usersAdapter.getSelectors((state) => state.users);

export const selectUsersStatus = (state) => state.users.status;
export const selectUsersActionStatus = (state) => state.users.actionStatus;
export const selectUsersError = (state) => state.users.error;
export const selectSelectedUserId = (state) => state.users.selectedUserId;
export const selectSelectedUser = (state) =>
  state.users.selectedUserId
    ? selectUserById(state, state.users.selectedUserId)
    : null;

/** Filter users by role */
export const selectUsersByRole = (role) => (state) =>
  selectAllUsers(state).filter((u) => u.role === role);

export default usersSlice.reducer;
