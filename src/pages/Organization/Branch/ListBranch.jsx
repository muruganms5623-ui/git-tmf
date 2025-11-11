import React, { useState, useEffect, useCallback } from "react";
import { Button, notification, FloatButton, Form, Input, Modal, Avatar, List, Skeleton, Divider, Menu, Dropdown, Popconfirm } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined, ExclamationCircleOutlined, DeleteFilled, EllipsisOutlined } from "@ant-design/icons";
import { GET_BRANCHES, DELETE, GET } from "helpers/api_helper";
import { ADD_BRANCH } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import BranchCollapseContent from "components/Common/BranchCollapseContent";
import "./ListBranch.css";
import InfiniteScroll from "react-infinite-scroll-component";
import { useNavigate } from "react-router-dom";
import branchIcon from "assets/images/location.png";
import SwipeablePanel from "components/Common/SwipeablePanel";

const ListBranch = () => {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  
  // const [deleteLoader, setDeleteLoader] = useState(false);
  // const [showConfirm, setShowConfirm] = useState(false);
  const [branchDetails, setBranchDetails] = useState({});
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  // const [filteredBranches, setFilteredBranches] = useState([]);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // 🧹 Delete branch
  const onDelete = async (record) => {
    try {
      // setDeleteLoader(true);
      const response = await DELETE(`${ADD_BRANCH}${record.id}/`);

      if (response?.status === 200) {
        setBranches((prev) => prev.filter((item) => item.id !== record.id));
        notification.success({
          message: `${record.branch_name?.toUpperCase()} Branch Deleted!`,
          description: "The branch has been deleted successfully.",
          duration: 2,
        });
      } else {
        notification.error({
          message: "Delete Failed",
          description: "The branch could not be deleted.",
        });
      }
    } catch (error) {
      console.error("Error deleting branch:", error);
      notification.error({
        message: "Error",
        description: "An error occurred while deleting the branch.",
      });
    } finally {
      // setDeleteLoader(false);
      // setShowConfirm(false);
    }
  };

  // 📋 Fetch branches list
  const getBranchesList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await GET_BRANCHES(ADD_BRANCH);
      if (response?.status === 200) {
        setBranches(response.data);
        setDisplayedBranches(response.data.slice(0, 10)); // ✅ Immediately set initial display
        setHasMore(response.data.length > 10);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    getBranchesList();
  }, [getBranchesList]);

  // 🔍 Handle Search Modal Actions
  const showSearchModal = () => setSearchModalVisible(true);
  const handleCancel = () => setSearchModalVisible(false);
  const handleSearch = () => {
    const { branchName } = form.getFieldsValue();
    if (!branchName) {
      notification.warning({
        message: "No Input",
        description: "Please enter a branch name to search.",
      });
      return;
    }

    const searchValue = branchName.toLowerCase().trim();
    setSearchTerm(searchValue); // ✅ Track that user searched something

    const filtered = branches.filter(
      (b) => b.branch_name?.toLowerCase().includes(searchValue)
    );

    if (filtered.length === 0) {
      notification.warning({
        message: "No Results",
        description: "No branches found matching your search.",
      });
    }

    setDisplayedBranches(filtered.slice(0, 10));
    setHasMore(filtered.length > 10);
    setSearchModalVisible(false);
  };


  // // ✅ Reset button (if needed)
  const handleReset = () => {
    form.resetFields();
    setSearchTerm(""); // ✅ Clear search term
    setDisplayedBranches(branches);
  };


  const handleAction = async (branch) => {
    setBranchDetails((prev) => {
      const isAlreadyExpanded = prev[branch.id]?.expanded;

      // collapse all others first
      const newState = {};
      Object.keys(prev).forEach((id) => {
        newState[id] = { ...prev[id], expanded: false };
      });

      // toggle clicked one
      newState[branch.id] = {
        expanded: !isAlreadyExpanded,
        data: prev[branch.id]?.data || null,
      };

      return newState;
    });

    // Fetch details only if expanding for the first time
    if (!branchDetails[branch.id]?.data) {
      try {
        const response = await GET(`/api/branch/${branch.id}/`);
        if (response?.status === 200) {
          setBranchDetails((prev) => ({
            ...Object.fromEntries(
              Object.entries(prev).map(([id, val]) => [
                id,
                { ...val, expanded: false },
              ])
            ),
            [branch.id]: {
              expanded: true,
              data: response.data,
            },
          }));
        }
      } catch (error) {
        console.error("Error fetching branch details:", error);
      }
    }
  };


  // Action menu (Edit/Delete)
  const renderMenu = (branch) => (
    <Menu>
      <Menu.Item
        key="edit"
        onClick={(e) => {
          e.domEvent.stopPropagation();
          navigate(`/branch/edit/${branch.id}`);
        }}
      >
        <div className="d-flex align-items-center gap-1">
          <span className="mdi mdi-pencil text-secondary mb-0"></span>
          <span>Edit</span>
        </div>
      </Menu.Item>

      <Menu.Item key="delete">
        <Popconfirm
          title={`Delete branch ${branch.branch_name}?`}
          description="Are you sure you want to delete?"
          icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
          onConfirm={(e) => {
            e.stopPropagation();
            onDelete(branch);
          }}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true, type: "primary" }}
          cancelButtonProps={{ type: "default" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="d-flex align-items-center gap-1" style={{ color: "red" }}>
            <DeleteFilled style={{ color: "red" }} />
            <span>Delete</span>
          </div>
        </Popconfirm>
      </Menu.Item>
    </Menu>
  );

  const [displayedBranches, setDisplayedBranches] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 10; // 🔹 how many branches to show per scroll

  useEffect(() => {
    // show first few items initially
    if (branches.length > 0) {
      setDisplayedBranches(branches.slice(0, itemsPerPage));
    }
  }, [branches]);

  const fetchMoreBranches = () => {
    const nextLength = displayedBranches.length + itemsPerPage;
    if (nextLength >= branches.length) {
      setDisplayedBranches(branches);
      setHasMore(false);
    } else {
      setDisplayedBranches(branches.slice(0, nextLength));
    }
  };
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // breakpoint for mobile
    };
    handleResize(); // check initially
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="page-content" style={{ padding: "16px" }}>
      {loading && <Loader />}

      {/* 🔹 Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginLeft: "-20px",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h2 style={{ marginTop: "-25px", marginBottom: 0, fontSize: "24px", fontWeight: 600 }}>
          All Branches
        </h2>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "-25px" }}>
          <Button
            icon={<SearchOutlined />}
            onClick={showSearchModal}
            className="search-button"

          >
            <span className="search-text">Search</span>
          </Button>

          {searchTerm && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              title="Reset Search"
            />
          )}

        </div>
      </div>


      {/* 🧾 Branch List */}
      <div
        id="scrollableDiv"
        style={{
          height: 500,
          overflow: "auto",
          padding: 0,
          margin: 0,

        }}
      >
        <InfiniteScroll
          dataLength={displayedBranches.length}
          style={{ padding: "0 18px" }}
          next={fetchMoreBranches}
          hasMore={hasMore}
          loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
          endMessage={<Divider plain>End of List✅</Divider>}
          scrollableTarget="scrollableDiv"
        >
        <List
  dataSource={displayedBranches}
  renderItem={(branch) => {
    const isExpanded = branchDetails[branch.id]?.expanded;
    const details = branchDetails[branch.id]?.data;

    // Handlers for swipe actions
    const handleEditBranch = (branch) => {
      // 🟦 Your edit logic (e.g., open edit modal)
      navigate(`/branch/edit/${branch.id}`); 
    };

    const handleDeleteBranch = (branch) => {
      // 🟥 Your delete logic (confirmation or API call)
      console.log("Deleting branch:", branch.branch_name);
      onDelete(branch);
    };

    return (
      <div
        key={branch.id}
        style={{
          borderBottom: "2px solid #f0f0f0",
          padding: "8px 0px",
          marginLeft: "-10px",
          marginRight: "-10px",
        }}
      >
    {isMobile ? (
  // 📱 MOBILE VIEW: Swipeable only when not expanded
  <SwipeablePanel
    item={branch}
    index={branch.id}
    titleKey="branch_name"
    name="branch"
    avatarSrc={branchIcon}
    onSwipeRight={!isExpanded ? () => handleEditBranch(branch) : undefined} // ✅ Disable swipe when expanded
    onSwipeLeft={!isExpanded ? () => handleDeleteBranch(branch) : undefined} // ✅ Disable swipe when expanded
    disableSwipe={isExpanded} // ✅ Optional safeguard (if supported by your component)
    isExpanded={isExpanded}
    onExpandToggle={() => handleAction(branch)}
    renderContent={() => (
      isExpanded ? ( // ✅ Show expanded details only when expanded
        <BranchCollapseContent branch={branch} details={details} />
      ) : null
    )}
  />
) : (
  // 💻 DESKTOP VIEW
  <>
    <List.Item
      onClick={() => handleAction(branch)}
      style={{
        cursor: "pointer",
        background: isExpanded ? "#f9f9f9" : "#fff",
      }}
    >
      <List.Item.Meta
        avatar={<Avatar src={branchIcon} />}
        title={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <span style={{ fontWeight: 600, color: "#1677ff" }}>
              {branch.branch_name}
            </span>
            <Dropdown overlay={renderMenu(branch)} trigger={["click"]}>
              <EllipsisOutlined
                style={{
                  fontSize: "22px",
                  color: "#999",
                  cursor: "pointer",
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </div>
        }
      />
    </List.Item>

    {isExpanded && details && (
      <div style={{ marginTop: 6 }}>
        <BranchCollapseContent branch={branch} details={details} />
      </div>
    )}
  </>
)}

      </div>
    );
  }}
/>

        </InfiniteScroll>
      </div>
      {/* 🔹 Search Modal */}
      <Modal
        title={<div style={{ textAlign: "center", width: "100%" }}>Search Branches</div>}
        open={searchModalVisible}
        onOk={handleSearch}
        onCancel={handleCancel}
        okText="Search"
        cancelText="Cancel"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Branch Name" name="branchName">
            <Input
              placeholder="Enter branch name to search"
              allowClear
              onChange={(e) => {
                const value = e.target.value.trim();
                if (value === "") {
                  // 🧹 Reset when cleared
                  // setFilteredBranches([]);
                  getBranchesList(); // reload all branches
                }
              }}
            />
          </Form.Item>
        </Form>

      </Modal>

      {/* 🔹 Floating Add Branch Button */}
      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        style={{
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          position: "fixed", // ✅ prevents scroll-triggered shift
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
        onClick={() => (window.location.href = "/branch/add")}
        tooltip="Add New Branch"
      />
    </div>
  );
};

export default ListBranch;
