import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, notification, Grid, List, Avatar, Dropdown, Menu, Modal, Collapse, Badge,Divider,Skeleton } from "antd";
import Table from "../../../components/Common/Table";
import { GET, DELETE, POST } from "helpers/api_helper";
import { LINE, COLUMNCHANGE, SELECTEDCOLUMN } from "helpers/url_helper";
import Loader from "components/Common/Loader";
// import ColumnDropdown from "../../../components/Common/ColumnDropdown";
import SwipeablePanel from "components/Common/SwipeablePanel";
import { EllipsisOutlined, SearchOutlined, ReloadOutlined, PlusOutlined} from "@ant-design/icons";
import LineCollapseContent from "components/Common/LineCollapseContent";
import { Switch, FloatButton } from "antd";
import reorderIcon from "../../../assets/up-and-down-arrow.png";
import lineIcon from '../../../assets/residential-area.png'
import InfiniteScroll from "react-infinite-scroll-component";
import branchIcon from "../../../assets/images/location.png"
// const { Panel } = Collapse;

let header = [
  {
    label: "S.No",
    value: "index",
  },
  {
    label: "Branch Name",
    value: "branch_name",
    sort: true,
    filter: true,
    filterSearch: true,
  },
  {
    label: "Line Name",
    value: "lineName",
    sort: true,
    filter: true,
    filterSearch: true,
  },
  {
    label: "Line Type",
    value: "lineType",
    sort: true,
    filter: true,
    filterSearch: true,
  },
  { label: "No of Installment", value: "installment", sort: true },
  { label: "Bad Loan Installment", value: "badinstallment", sort: true },
  { label: "Actions", value: "actions" },
];

// const hiddenColumns = ["move", "order", "actions", "index"];

const ViewLine = () => {
  const navigate = useNavigate();
  const [reOrder, setReorder] = useState(false);
  const [rowReorderred, setRowReorderred] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [groupedData, setGroupedData] = useState({}); // New state for grouped data
  const [order, setOrder] = useState({});
  const [tableHeader, setTableHeader] = useState(header);
  const [tableLoader, setTableLoader] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteLoader, setDeleteLoader] = useState(false);
  const [reorderLoader, setReorderLoader] = useState(false);
  const [filterOption, setFilterOption] = useState({
    lineType: [
      { text: "Daily", value: "daily" },
      { text: "Weekly", value: "weekly" },
      { text: "Monthly", value: "monthly" },
    ],
  });
  const [selectedColumn, setSelectedColumn] = useState([]);
  const [isDragMode, setIsDragMode] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchOptions, setBranchOptions] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState([]); // Track expanded branches
  const [expandedLines, setExpandedLines] = useState({}); // Track expanded lines within branches
  const [openSwipeId, setOpenSwipeId] = useState(null); // Track which item is swiped open

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  // const [lineDetails, setLineDetails] = useState({});
   const BRANCH_PAGE_SIZE = 10; // number of headers to load at a time
  const [visibleBranchCount, setVisibleBranchCount] = useState(BRANCH_PAGE_SIZE);

  const branchList = Object.keys(groupedData);
  const visibleBranches = branchList.slice(0, visibleBranchCount);
  const [selectedBranchFromStorage, setSelectedBranchFromStorage] = useState(null);
const [linesPagination, setLinesPagination] = useState({}); // Track displayed lines per branch
const LINES_PAGE_SIZE = 3; // Number of lines to load at a time
 /**
  * The function `loadMoreBranches` increases the visible branch count by a specified page size or up
  * to the total number of branches in the list.
  */
  // const loadMoreBranches = () => {
  //   setVisibleBranchCount(prev => Math.min(prev + BRANCH_PAGE_SIZE, branchList.length));
  // };

  useEffect(() => {
    getSelectedColumn();
    getLineList();
  }, []);
  useEffect(() => {
  // Get branch from localStorage
  const storedBranchName = localStorage.getItem("selected_branch_name");
  setSelectedBranchFromStorage(storedBranchName);
  
  getSelectedColumn();
  getLineList();
}, []);

  // Group data by branch name
  const groupLinesByBranch = (data) => {
    const grouped = {};
    data.forEach((line) => {
      const branchName = line.branch_name || "Uncategorized";
      if (!grouped[branchName]) {
        grouped[branchName] = [];
      }
      grouped[branchName].push(line);
    });
    return grouped;
  };

  const sortData = (order) => {
    if (Object.keys(order).length > 0) {
      const reorderedData = [...tableData];
      Object.keys(order).forEach((value) => {
        const index = reorderedData.findIndex(
          (item) => item.id === parseInt(value)
        );
        if (index !== -1) {
          const [movedItem] = reorderedData.splice(index, 1);
          reorderedData.splice(order[value] - 1, 0, movedItem);
        }
      });
      return reorderedData;
    }
  };

const handleReset = () => {
    // Simply restore originalData which already contains all lines from the selected branch
    const grouped = groupLinesByBranch(originalData);
    
    // CRITICAL FIX: Create fresh pagination state
    const newPagination = {};
    Object.keys(grouped).forEach(branchName => {
      newPagination[branchName] = {
        displayed: Math.min(LINES_PAGE_SIZE, grouped[branchName].length),
        total: grouped[branchName].length
      };
    });
    
    setTableData(originalData);
    setGroupedData(grouped);
    setLinesPagination(newPagination);
    
    setShowReset(false);
    setSelectedBranch(null);
    setSearchText("");
    
    notification.success({
      message: "Data Reset",
      description: "Restored to the original view successfully.",
    });
  };

const SumbitReorder = async () => {
  try {
    setReorderLoader(true);
    const reorderedData =
      Object.keys(order)?.length > 0 ? sortData(order) : tableData;
    const response = await POST(`${LINE}reorder/`, reorderedData);
    if (response?.status === 200) {
      // Get the branch from localStorage
      const storedBranchName = localStorage.getItem("selected_branch_name");
      
      // CRITICAL FIX: Properly update originalData by replacing items from the selected branch
      // with the reordered items, while keeping other branches unchanged
      const reorderedIds = new Set(reorderedData.map(item => item.id));
      
      // Remove old items from the selected branch and add the reordered ones
      const updatedOriginalData = [
        ...originalData.filter(item => !reorderedIds.has(item.id)),
        ...reorderedData
      ];
      
      // Filter by stored branch to show updated data
      let finalData = updatedOriginalData;
      if (storedBranchName) {
        finalData = updatedOriginalData.filter(
          (item) => item.branch_name === storedBranchName
        );
      }
      
      setOriginalData(updatedOriginalData);
      setTableData(finalData);
      const grouped = groupLinesByBranch(finalData);
      setGroupedData(grouped);
      
      // Reinitialize pagination with fresh state
      const newPagination = {};
      Object.keys(grouped).forEach(branchName => {
        newPagination[branchName] = {
          displayed: Math.min(LINES_PAGE_SIZE, grouped[branchName].length),
          total: grouped[branchName].length
        };
      });
      setLinesPagination(newPagination);
      
      setReorder(false);
      setRowReorderred(false);
      const filtered = header.filter(
        (item) => !["move", "order"].includes(item.value)
      );
      setTableHeader(filtered);
      setOrder({});
      setSelectedBranch(null);
      setShowReset(false);
      setSearchText("");
      setIsDragMode(false);
      
      notification.success({
        message: "Re-Ordered",
        description: "The order has been updated successfully.",
        duration: 0,
      });
    } else {
      notification.error({
        message: "Re-Ordered",
        description: "Failed to update the order",
        duration: 0,
      });
    }
    setReorderLoader(false);
  } catch (e) {
    setReorderLoader(false);
    notification.error({
      message: "Error",
      description: "Failed to update the order",
    });
  }
};

const clickReorder = () => {
  // Get branch from localStorage
  const storedBranchName = localStorage.getItem("selected_branch_name");
  
  if (!storedBranchName) {
    notification.warning({
      message: "No Branch Selected",
      description: "Please select a branch from settings.",
    });
    return;
  }

  // CRITICAL FIX: Always use originalData (not the filtered tableData from search)
  const filteredData = originalData.filter(
    (item) => item.branch_name === storedBranchName
  );

  if (filteredData.length === 0) {
    notification.warning({
      message: "No Lines Found",
      description: `No lines available for ${storedBranchName} branch.`,
    });
    return;
  }

  // Clear search state before entering reorder mode
  setShowReset(false);
  setSearchText("");

  // Set the selected branch and filtered data
  setSelectedBranch(storedBranchName);
  setTableData(filteredData);
  
  // Add reorder columns to header
  setTableHeader((prev) => {
    return [
      { label: "Move", value: "move" },
      { label: "Order", value: "order" },
      ...prev,
    ];
  });
  
  // Enable reorder mode directly
  setReorder(true);
};
const getLineList = async () => {
  try {
    setTableLoader(true);
    const response = await GET(LINE);
    if (response?.status === 200) {
      // Get branch from localStorage
      const storedBranchName = localStorage.getItem("selected_branch_name");
      
      // Filter data by selected branch from localStorage
      let filteredData = response.data;
      if (storedBranchName) {
        filteredData = response.data.filter(
          (item) => item.branch_name === storedBranchName
        );
      }
      
      setTableData(filteredData);
      setOriginalData(filteredData);
      const grouped = groupLinesByBranch(filteredData);
      setGroupedData(grouped);

      // Initialize pagination for each branch
      Object.keys(grouped).forEach(branchName => {
        initializeBranchPagination(branchName, grouped[branchName].length);
      });

      const filterCol = ["branch_name", "lineName"];
      const uniqueOptions = {};
      filterCol.forEach((col) => {
        uniqueOptions[col] = new Set();
      });

      filteredData.forEach((item) => {
        filterCol.forEach((col) => {
          uniqueOptions[col].add(item[col]);
        });
      });

      filterCol.forEach((col) => {
        setFilterOption((prev) => ({
          ...prev,
          [col]: Array.from(uniqueOptions[col]).map((value) => ({
            text: value,
            value: value,
          })),
        }));
      });

      const uniqueBranches = [
        ...new Set(filteredData.map((item) => item.branch_name)),
      ];
      setBranchOptions(uniqueBranches.map((b) => ({ label: b, value: b })));
      
      // Auto-expand the branch header
      if (storedBranchName) {
        setExpandedBranches([storedBranchName]);
      }
    } else {
      setTableData([]);
      setOriginalData([]);
      setGroupedData({});
    }
  } catch (error) {
    setTableData([]);
    setOriginalData([]);
    setGroupedData({});
  } finally {
    setTableLoader(false);
  }
};


// Initialize pagination for a branch
const initializeBranchPagination = (branchName, totalLines) => {
  setLinesPagination(prev => ({
    ...prev,
    [branchName]: {
      displayed: Math.min(LINES_PAGE_SIZE, totalLines),
      total: totalLines
    }
  }));
};

// Load more lines for a specific branch
const loadMoreLines = (branchName) => {
  setLinesPagination(prev => {
    const current = prev[branchName] || { displayed: 0, total: 0 };
    return {
      ...prev,
      [branchName]: {
        ...current,
        displayed: Math.min(current.displayed + LINES_PAGE_SIZE, current.total)
      }
    };
  });
};

  const handleReOrder = (event, row) => {
    event.preventDefault();
    setRowReorderred(true);
    setOrder((prev) => ({ ...prev, [row.id]: event.target.value }));
  };

  const handleDragEnd = (data) => {
    setTableData(data);
    setRowReorderred(true);
  };

  const handleCancel = () => {
  const filtered = header.filter(
    (item) => !["move", "order"].includes(item.value)
  );
  setIsDragMode(false);
  setTableHeader(filtered);
  setReorder(false);
  setSelectedBranch(null);
  
  // Get branch from localStorage and restore filtered data
  const storedBranchName = localStorage.getItem("selected_branch_name");
  if (storedBranchName) {
    const filteredData = originalData.filter(
      (item) => item.branch_name === storedBranchName
    );
    setTableData(filteredData);
    const grouped = groupLinesByBranch(filteredData);
    setGroupedData(grouped);
    
    // Reinitialize pagination
    Object.keys(grouped).forEach(branchName => {
      initializeBranchPagination(branchName, grouped[branchName].length);
    });
  } else {
    setTableData(originalData);
    setGroupedData(groupLinesByBranch(originalData));
  }
  
  // Reset search if it was active
  setSearchText("");
  setShowReset(false);
};

  const onDelete = async (record) => {
    try {
      setDeleteLoader(true);
      const response = await DELETE(`${LINE}${record.id}/`);
      if (response?.status === 200) {
        const updatedData = tableData.filter((item) => item.id !== record.id);
        setTableData(updatedData);
        setGroupedData(groupLinesByBranch(updatedData));
        notification.success({
          message: `${record?.lineName.toUpperCase()} Line Deleted!`,
          description: "The line has been deleted successfully",
          duration: 0,
        });
      } else {
        notification.error({
          message: "Line Delete",
          description: "The line is not deleted",
          duration: 0,
        });
      }
      setDeleteLoader(false);
      setShowConfirm(false);
    } catch (error) {
      setDeleteLoader(false);
      setShowConfirm(false);
      notification.error({
        message: "Line Deleted",
        description: "The line is not deleted",
        duration: 0,
      });
    }
  };

  const handleColumnChange = async (value) => {
    try {
      const res = await POST(COLUMNCHANGE, {
        entity: "line",
        columns: value,
      });
      setSelectedColumn(value);
      if (res.status === 200) {
        getLineList();
      }
    } catch (error) {
      throw error;
    }
  };

  const getSelectedColumn = async () => {
    try {
      const res = await GET(SELECTEDCOLUMN);
      if (res.status === 200) {
        setSelectedColumn(res?.data?.line || []);
      }
    } catch (error) {
      throw error;
    }
  };


const handleLineAction = (branchName, lineId) => {
  const key = `${branchName}-${lineId}`;
  // Close any open swipe first
  setOpenSwipeId(null);
  setExpandedLines((prev) => {
    const newState = {
      [key]: !prev[key]
    };
    
    // Scroll to the item after a brief delay to allow the expand animation
    if (newState[key]) {
      setTimeout(() => {
        const element = document.getElementById(`line-item-${lineId}`);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    }
    
    return newState;
  });
};

  const handleSwipeStateChange = (lineId, isOpen) => {
    // When a swipe opens, set it as the currently open one (this closes all others)
    // When a swipe closes, only clear if it's the currently open one
    if (isOpen) {
      setOpenSwipeId(lineId);
    } else if (openSwipeId === lineId) {
      setOpenSwipeId(null);
    }
  };



  // const handleBranchSubmit = () => {
  //   if (!selectedBranch) {
  //     notification.warning({
  //       message: "Select a Branch",
  //       description: "Please choose a branch before continuing.",
  //     });
  //     return;
  //   }

  //   const filteredData = originalData.filter(
  //     (item) => item.branch_name === selectedBranch
  //   );

  //   setTableData(filteredData);
  //   setBranchModalVisible(false);
  //   setReorder(true);
  //   setTableHeader((prev) => [
  //     { label: "Move", value: "move" },
  //     { label: "Order", value: "order" },
  //     ...prev,
  //   ]);
  // };

const handleSearch = () => {
  const query = searchText.trim().toLowerCase();

  if (!query) {
    setTableData(originalData);
    const grouped = groupLinesByBranch(originalData);
    setGroupedData(grouped);
    
    // Reinitialize pagination
    Object.keys(grouped).forEach(branchName => {
      initializeBranchPagination(branchName, grouped[branchName].length);
    });
    
    setSearchModalVisible(false);
    setShowReset(false);
    notification.info({
      message: "Reset Search",
      description: "Showing all lines again.",
    });
    return;
  }

  // Filter only by line name and line type (NOT branch name)
  const filtered = originalData.filter((item) => {
    const lineName = (item.lineName || "").toLowerCase();
    const lineType = (item.lineType || "").toLowerCase();

    return lineName.includes(query) || lineType.includes(query);
  });

  setTableData(filtered);
  const grouped = groupLinesByBranch(filtered);
  setGroupedData(grouped);
  
  // Reinitialize pagination for filtered results
  Object.keys(grouped).forEach(branchName => {
    initializeBranchPagination(branchName, grouped[branchName].length);
  });
  
  setSearchModalVisible(false);
  setShowReset(true);

  if (filtered.length === 0) {
    notification.warning({
      message: "No Results",
      description: `No matches found for "${searchText}".`,
    });
  } else {
    notification.success({
      message: "Search Complete",
      description: `${filtered.length} result(s) found for "${searchText}".`,
    });
  }
};

  

  const searchModal = (
    <Modal
      title={<div style={{ textAlign: "center", width: "100%" }}>Search Line</div>}
      open={searchModalVisible}
      onOk={handleSearch}
      onCancel={() => setSearchModalVisible(false)}
      okText="Search"
    >
      <p style={{ marginBottom: 10, fontWeight: 500 }}>Line Name</p>
      <input
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Enter line name to search"
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid #d9d9d9",
          outline: "none",
        }}
      />
    </Modal>
  );

  const handleEditLine = (line) => navigate(`/line/edit/${line.id}`);

  return (
    
    <div className="page-content" style={{ padding: 0, margin: "0px 0px " }}>
      {/* Main Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 0,
          marginLeft: 0,
          padding: 0,
          marginBottom: "10px",
        }}
      >
        {/* Left Side - Title */}
        {reOrder && !branchModalVisible ? (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>
              Reorder Lines
            </h2>
            <div style={{ fontSize: "14px", color: "#8c8c8c", marginTop: "4px" }}>
              Selected Branch: <span style={{ color: "#1677ff", fontWeight: 500 }}>{selectedBranch}</span>
            </div>
          </div>
        ) : (
          <h2 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>All Lines</h2>
        )}

        {/* Right Side - Actions/Switch */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {reOrder && !branchModalVisible ? (
            <>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#595959" }}>Slide</span>
              <Switch
                checked={isDragMode}
                onChange={(checked) => setIsDragMode(checked)}
              />
            </>
          ) : (
            <>
              <Button
                onClick={clickReorder}
                disabled={reOrder}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  width: "32px",
                }}
              >
                <img
                  src={reorderIcon}
                  alt="Reorder Icon"
                  style={{ width: "16px", height: "16px" }}
                />
              </Button>
              {showReset && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  title="Reset to Original"
                />
              )}
              <Button
                icon={<SearchOutlined />}
                onClick={() => setSearchModalVisible(true)}
                type="default"
              >
                {!isMobile && "Search"}
              </Button>
            </>
          )}
        </div>
      </div>
      {searchModal}

      {tableLoader && <Loader />}
{reOrder && !branchModalVisible ? (
  <div>
    {/* Table */}
    <Table
      data={tableData}
      reOrder={isDragMode}
      Header={
        isDragMode
          ? [
              
              { label: "S.No", value: "index" },
              { label: "Line Name", value: "lineName" },
              { label: "Move", value: "move" },
            ]
          : [
              
              { label: "S.No", value: "index" },
              { label: "Reorder", value: "order" },
              { label: "Line Name", value: "lineName" },
            ]
      }
      filterOption={filterOption}
      handleDragEnd={isDragMode ? handleDragEnd : undefined}
      handleReOrder={!isDragMode ? handleReOrder : undefined}
      deleteLoader={deleteLoader}
      setShowConfirm={setShowConfirm}
      showConfirm={showConfirm}
      name="line"
    />

    {/* Action Buttons */}
    <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
      <Button
        type="primary"
        onClick={SumbitReorder}
        loading={reorderLoader}
        disabled={reorderLoader}
      >
        Submit
      </Button>
      <Button onClick={handleCancel}>Cancel</Button>
    </div>
  </div>
) : (
  // GROUPED LIST VIEW BY BRANCH
  <div
    id="scrollableDiv"
    style={{
      height: 500,
      width: "auto",
      overflow: "auto",
      padding: "10px",
      marginTop: 20,
    }}
  >
    {/* Search Results Header - Show only when searching */}
    {showReset && searchText && (
      <div
        style={{
          padding: "12px 0px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "left"
         
        }}
      >
        <span style={{ fontSize: "14px", color: "#8c8c8c" }}>
          Search Results:{" "}
          <span style={{ fontWeight: 600, color: "#1677ff", fontSize: "15px" }}>
            "{searchText}"
          </span>
        </span>
        <span style={{ 
          marginLeft: "12px", 
          fontSize: "13px", 
          color: "#52c41a",
          fontWeight: 500 
        }}>
          ({Object.values(groupedData).flat().length} results)
        </span>
      </div>
    )}

    {Object.keys(groupedData).map((branchName) => {
      return (
        <div
          key={branchName}
          style={{
            marginBottom: "12px",
            border: "1px solid #e8e8e8",
            borderRadius: "8px",
            overflow: "hidden",
            backgroundColor: "#fff"
          }}
        >
         

          {/* Branch Header - Always Visible, Not Collapsible */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px",
              backgroundColor: "#f5f5f5",
              borderBottom: "1px solid #e8e8e8"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar src={branchIcon}>
                {branchName?.charAt(0)?.toUpperCase()}
              </Avatar>
              <span style={{ fontWeight: 600, fontSize: "18px", color: "#262626" }}>
                {branchName}
              </span>
            </div>
            <Badge
              count={groupedData[branchName].length}
              style={{
                backgroundColor: showReset ? "#1677ff" : "#52c41a",
                fontWeight: 500,
                boxShadow: "0 0 0 1px #fff"
              }}
            />
          </div>

          {/* Lines List with Infinite Scroll - Always Expanded */}
          <div 
            id={'scrollableDiv-' + branchName}
            style={{ 
              maxHeight: 400, 
              overflow: "auto", 
              padding: 0
            }}
          >
            <InfiniteScroll
              dataLength={linesPagination[branchName]?.displayed || LINES_PAGE_SIZE}
              next={() => loadMoreLines(branchName)}
              hasMore={
                (linesPagination[branchName]?.displayed || 0) < 
                (linesPagination[branchName]?.total || 0)
              }
              loader={
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <Skeleton avatar paragraph={{ rows: 1 }} active />
                </div>
              }
              endMessage={
                <Divider plain style={{ margin: "16px 0" }}>
                  <span style={{ color: "red", fontSize: "18px", fontWeight: "bold" }}>★*</span>
                  <span style={{ color: "#595959", fontSize: "14px" }}>
                    End of{" "}
                    <span style={{ fontWeight: 600, color: "#262626" }}>
                      {branchName} branch
                    </span>{" "}
                    <span style={{ color: "red", fontSize: "18px", fontWeight: "bold" }}>*★</span>
                  </span>
                </Divider>
              }
              scrollableTarget={'scrollableDiv-' + branchName}
            >
              <List
                dataSource={
                  groupedData[branchName].slice(
                    0, 
                    linesPagination[branchName]?.displayed || LINES_PAGE_SIZE
                  )
                }
                style={{ background: "#fafafa", margin: 0 }}
                renderItem={(line) => {
                  const isExpanded = expandedLines[branchName + '-' + line.id];

                  return (
                    <div
                      key={line.id}
                      id={'line-item-' + line.id}
                      style={{
                        borderBottom: "2px solid #f0f0f0",
                        padding: 0,
                        background: "#fff",
                      }}
                    >
                      {isMobile ? (
                        <SwipeablePanel
                          item={line}
                          index={line.id}
                          titleKey="lineName"
                          name="line"
                          avatarSrc={lineIcon}
                          onSwipeRight={!isExpanded ? () => handleEditLine(line) : undefined}
                          onSwipeLeft={!isExpanded ? () => onDelete(line) : undefined}
                          isExpanded={isExpanded}
                          onExpandToggle={() => handleLineAction(branchName, line.id)}
                          renderContent={() => (
                            isExpanded ? (
                              <LineCollapseContent line={line} />
                            ) : null
                          )}
                          isSwipeOpen={openSwipeId === line.id}
                          onSwipeStateChange={(isOpen) => handleSwipeStateChange(line.id, isOpen)}
                        />
                      ) : (
                        <>
                          <List.Item
                            style={{
                              background: isExpanded ? "#f9f9f9" : "#fff",
                              cursor: "default",
                              padding: "12px 16px",
                            }}
                          >
                            <List.Item.Meta
                              avatar={
                                <div style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "50%",
                                  backgroundColor: "#000",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                  </svg>
                                </div>
                              }
                              title={
                                <div
                                  onClick={() => handleLineAction(branchName, line.id)}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    width: "100%",
                                    cursor: "pointer",
                                    padding: "6px 0",
                                  }}
                                >
                                  <span style={{ fontWeight: 600, color: "black" }}>
                                    {line.lineName}
                                  </span>
                                  <Dropdown
                                    overlay={
                                      <Menu>
                                        <Menu.Item 
                                          key="edit"
                                          onClick={(e) => {
                                            e.domEvent.stopPropagation();
                                            handleEditLine(line);
                                          }}
                                        >
                                          Edit
                                        </Menu.Item>
                                        <Menu.Item 
                                          key="delete"
                                          danger 
                                          onClick={(e) => {
                                            e.domEvent.stopPropagation();
                                            onDelete(line);
                                          }}
                                        >
                                          Delete
                                        </Menu.Item>
                                      </Menu>
                                    }
                                    trigger={["click"]}
                                  >
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

                          {isExpanded && (
                            <div style={{ marginTop: 6, padding: "0 16px 16px 16px", background: "#f9f9f9" }}>
                              <LineCollapseContent line={line} />
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
        </div>
      );
    })}

    {Object.keys(groupedData).length === 0 && !tableLoader && (
      <div style={{ textAlign: "center", padding: "40px", color: "#8c8c8c" }}>
        <p>No lines found {showReset && searchText ? 'for "' + searchText + '"' : "for the selected branch"}</p>
      </div>
    )}
  </div>
)}

      {!reOrder && (
        <FloatButton
          icon={<PlusOutlined />}
          type="primary"
          tooltip={<div>Add New Line</div>}
          onClick={() => navigate("/line/add")}
          style={{
            right: 24,
            bottom: 24,
            width: 56,
            height: 56,
            position: "fixed",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        />
      )}
    </div>
  );
};

export default ViewLine;
