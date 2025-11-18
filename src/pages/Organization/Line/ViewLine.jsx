import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, notification, Grid, List, Avatar, Dropdown, Menu, Select, Modal, Collapse, Badge } from "antd";
import Table from "../../../components/Common/Table";
import { GET, DELETE, POST } from "helpers/api_helper";
import { LINE, COLUMNCHANGE, SELECTEDCOLUMN } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import ColumnDropdown from "../../../components/Common/ColumnDropdown";
import SwipeablePanel from "components/Common/SwipeablePanel";
import { EllipsisOutlined, SearchOutlined, ReloadOutlined, PlusOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";
import LineCollapseContent from "components/Common/LineCollapseContent";
import { Switch, FloatButton } from "antd";
import reorderIcon from "../../../assets/up-and-down-arrow.png";
import lineIcon from '../../../assets/industrial-area.png'
const { Panel } = Collapse;

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

const hiddenColumns = ["move", "order", "actions", "index"];

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
  const [lineDetails, setLineDetails] = useState({});

  useEffect(() => {
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

  const SumbitReorder = async () => {
    try {
      setReorderLoader(true);
      const reorderedData =
        Object.keys(order)?.length > 0 ? sortData(order) : tableData;
      const response = await POST(`${LINE}reorder/`, reorderedData);
      if (response?.status === 200) {
        // Update the original data with reordered data for the selected branch
        const updatedOriginalData = originalData.map((item) => {
          const reorderedItem = reorderedData.find((r) => r.id === item.id);
          return reorderedItem || item;
        });
        
        // Replace items from selected branch with reordered ones
        const branchItemIds = reorderedData.map(item => item.id);
        const otherBranchItems = originalData.filter(item => !branchItemIds.includes(item.id));
        const finalData = [...otherBranchItems, ...reorderedData];
        
        setOriginalData(finalData);
        setTableData(finalData);
        setGroupedData(groupLinesByBranch(finalData));
        setReorder(false);
        setRowReorderred(false);
        const filtered = header.filter(
          (item) => !["move", "order"].includes(item.value)
        );
        setTableHeader(filtered);
        setOrder({});
        setSelectedBranch(null);
        setShowReset(false);
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

  const handleReset = () => {
    setTableData(originalData);
    setGroupedData(groupLinesByBranch(originalData));
    setShowReset(false);
    setSelectedBranch(null);
    setSearchText("");
    notification.success({
      message: "Data Reset",
      description: "Restored to the original order successfully.",
    });
  };

  const getLineList = async () => {
    try {
      setTableLoader(true);
      const response = await GET(LINE);
      if (response?.status === 200) {
        setTableData(response.data);
        setOriginalData(response.data);
        setGroupedData(groupLinesByBranch(response.data));

        const filterCol = ["branch_name", "lineName"];
        const uniqueOptions = {};
        filterCol.forEach((col) => {
          uniqueOptions[col] = new Set();
        });

        response.data.forEach((item) => {
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
          ...new Set(response.data.map((item) => item.branch_name)),
        ];
        setBranchOptions(uniqueBranches.map((b) => ({ label: b, value: b })));
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

  const clickReorder = () => {
    setBranchModalVisible(true);
    setTableHeader((prev) => {
      return [
        { label: "Move", value: "move" },
        { label: "Order", value: "order" },
        ...prev,
      ];
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
    setTableHeader(filtered);
    setReorder(false);
    setSelectedBranch(null);
    setTableData(originalData);
    setGroupedData(groupLinesByBranch(originalData));
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
      // Close all other lines, keep only the clicked one
      return {
        [key]: !prev[key]
      };
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

  // NEW: Handle branch collapse change
  const handleBranchChange = (keys) => {
    setExpandedBranches(keys);
    // When collapsing a branch (keys becomes empty or reduces), close all expanded lines
    if (keys.length === 0 || keys.length < expandedBranches.length) {
      setExpandedLines({});
      setOpenSwipeId(null);
    }
  };

  const handleBranchSubmit = () => {
    if (!selectedBranch) {
      notification.warning({
        message: "Select a Branch",
        description: "Please choose a branch before continuing.",
      });
      return;
    }

    const filteredData = originalData.filter(
      (item) => item.branch_name === selectedBranch
    );

    setTableData(filteredData);
    setBranchModalVisible(false);
    setReorder(true);
    setTableHeader((prev) => [
      { label: "Move", value: "move" },
      { label: "Order", value: "order" },
      ...prev,
    ]);
  };

  const handleSearch = () => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      setTableData(originalData);
      setGroupedData(groupLinesByBranch(originalData));
      setSearchModalVisible(false);
      notification.info({
        message: "Reset Search",
        description: "Showing all lines again.",
      });
      return;
    }

    const filtered = originalData.filter((item) => {
      const lineName = (item.lineName || "").toLowerCase();
      const branch = (item.branch_name || "").toLowerCase();
      const lineType = (item.lineType || "").toLowerCase();

      return (
        lineName.includes(query) ||
        branch.includes(query) ||
        lineType.includes(query)
      );
    });

    setTableData(filtered);
    setGroupedData(groupLinesByBranch(filtered));
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

  const branchSelectionModal = (
    <Modal
      title="Select Branch for Re-Ordering"
      open={branchModalVisible}
      onOk={handleBranchSubmit}
      onCancel={() => setBranchModalVisible(false)}
      okText="Continue"
    >
      <p style={{ marginBottom: 10 }}>Choose a branch to view its line list:</p>
      <Select
        style={{ width: "100%" }}
        placeholder="Select Branch"
        options={branchOptions}
        value={selectedBranch}
        onChange={setSelectedBranch}
        showSearch
        optionFilterProp="label"
      />
    </Modal>
  );

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

      {branchSelectionModal}
      {searchModal}

      {tableLoader && <Loader />}

      {!reOrder && !isMobile && (
        <div style={{ marginBottom: 10 }}>
          <ColumnDropdown
            options={header.filter(
              (list) => !hiddenColumns.includes(list?.value)
            )}
            onChange={handleColumnChange}
            name={"line_column"}
            selectedColumn={selectedColumn}
          />
        </div>
      )}

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
                    { label: "Move", value: "move" },
                    { label: "Line Name", value: "lineName" },
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
            overflow: "auto",
            padding: 0,
            marginTop: 20,
          }}
        >
          <Collapse
            accordion={true}
            activeKey={expandedBranches}
            onChange={handleBranchChange}
            style={{ 
              background: "#fff",
              border: "none"
            }}
            expandIcon={({ isActive }) => 
              isActive ? <DownOutlined style={{ fontSize: 12 }} /> : <RightOutlined style={{ fontSize: 12 }} />
            }
          >
            {Object.keys(groupedData).map((branchName) => {
              const isActive = expandedBranches.includes(branchName);
              
              return (
                <Panel
                  header={
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                      <span style={{ fontWeight: 600, fontSize: "18px", color: "#262626"}}>
                        {branchName}
                      </span>
                      <Badge 
                        count={groupedData[branchName].length} 
                        style={{ 
                          backgroundColor: "#52c41a",
                          fontWeight: 500,
                          boxShadow: "0 0 0 1px #fff"
                        }} 
                      />
                    </div>
                  }
                  key={branchName}
                  style={{
                    marginBottom: "12px",
                    border: "1px solid #e8e8e8",
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundColor: isActive ? "#f5f5f5" : "#fff"
                  }}
                  className={isActive ? "active-panel" : ""}
                >
                <List
                  dataSource={groupedData[branchName]}
                  style={{ background: "#fafafa" }}
                  renderItem={(line) => {
                    const isExpanded = expandedLines[`${branchName}-${line.id}`];

                    return (
                      <div
                        key={line.id}
                        style={{
                          borderBottom: "1px solid #e8e8e8",
                          padding: 0,
                          background: "#fff",
                          marginBottom: "8px",
                          borderRadius: "6px",
                          overflow: "hidden"
                        }}
                      >
                        {isMobile ? (
                          <div style={{ padding: 0 }}>
                            <SwipeablePanel
                              item={line}
                              index={line.id}
                              titleKey="lineName"
                              name="line"
                              avatarSrc={lineIcon}
                              onSwipeRight={
                                !isExpanded ? () => {
                                  setOpenSwipeId(null);
                                  handleEditLine(line);
                                } : undefined
                              }
                              onSwipeLeft={!isExpanded ? () => {
                                setOpenSwipeId(null);
                                onDelete(line);
                              } : undefined}
                              isExpanded={isExpanded}
                              onExpandToggle={() => {
                                setOpenSwipeId(null); // Close any open swipe first
                                handleLineAction(branchName, line.id);
                              }}
                              renderContent={() => <LineCollapseContent line={line} />}
                              isSwipeOpen={openSwipeId === line.id}
                              onSwipeStateChange={(isOpen) => handleSwipeStateChange(line.id, isOpen)}
                            />
                          </div>
                        ) : (
                          <>
                            <List.Item
                              onClick={() => handleLineAction(branchName, line.id)}
                              style={{
                                cursor: "pointer",
                                background: isExpanded ? "#f0f5ff" : "#fff",
                                padding: "12px 16px",
                                transition: "all 0.3s ease"
                              }}
                            >
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                  icon = {lineIcon}
                                    style={{ 
                                      backgroundColor: "#1677ff",
                                      fontSize: "16px",
                                      fontWeight: 600
                                    }}
                                  >
                                    {line.lineName?.charAt(0)?.toUpperCase()}
                                  </Avatar>
                                }
                                title={
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      width: "100%",
                                    }}
                                  >
                                    <span style={{ fontWeight: 500, color: "#262626", fontSize: "15px" }}>
                                      {line.lineName}
                                    </span>

                                    <Dropdown
                                      overlay={
                                        <Menu>
                                          <Menu.Item onClick={() => handleEditLine(line)}>
                                            Edit
                                          </Menu.Item>
                                          <Menu.Item danger onClick={() => onDelete(line)}>
                                            Delete
                                          </Menu.Item>
                                        </Menu>
                                      }
                                      trigger={["click"]}
                                    >
                                      <EllipsisOutlined
                                        style={{
                                          fontSize: "20px",
                                          color: "#8c8c8c",
                                          cursor: "pointer",
                                          padding: "4px"
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </Dropdown>
                                  </div>
                                }
                                description={
                                  <span style={{ fontSize: "13px", color: "#8c8c8c" }}>
                                    {line.lineType} • {line.installment} installments
                                  </span>
                                }
                              />
                            </List.Item>

                            {isExpanded && (
                              <div style={{ 
                                padding: "5px", 
                                background: "#fafafa",
                                borderTop: "1px solid #e8e8e8"
                              }}>
                                <LineCollapseContent line={line} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }}
                />
              </Panel>
            );
          })}
          </Collapse>
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
