import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, notification, Grid, List, Avatar, Dropdown, Menu, Modal, Badge, Divider, Skeleton } from "antd";
import Table from "../../../components/Common/Table";
import { GET, DELETE, POST } from "helpers/api_helper";
import { AREA, COLUMNCHANGE, SELECTEDCOLUMN } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import SwipeablePanel from "components/Common/SwipeablePanel";
import { EllipsisOutlined, SearchOutlined, ReloadOutlined, PlusOutlined } from "@ant-design/icons";
import AreaCollapseContent from "components/Common/AreaCollapseContent";
import { Switch, FloatButton } from "antd";
import reorderIcon from "../../../assets/up-and-down-arrow.png";
import areaIcon from '../../../assets/residential-area.png';
import InfiniteScroll from "react-infinite-scroll-component";
import lineIcon from "../../../assets/images/location.png";

let header = [
  {
    label: "S.No",
    value: "index",
  },
  {
    label: "Line Name",
    value: "line_name",
    sort: true,
    filter: true,
    filterSearch: true,
  },
  {
    label: "Area Name",
    value: "areaName",
    sort: true,
    filter: true,
    filterSearch: true,
  },
  { label: "Actions", value: "actions" },
];

const ViewArea = () => {
  const navigate = useNavigate();
  const [reOrder, setReorder] = useState(false);
  const [rowReorderred, setRowReorderred] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [order, setOrder] = useState({});
  const [tableHeader, setTableHeader] = useState(header);
  const [tableLoader, setTableLoader] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteLoader, setDeleteLoader] = useState(false);
  const [reorderLoader, setReorderLoader] = useState(false);
  const [filterOption, setFilterOption] = useState({});
  const [selectedColumn, setSelectedColumn] = useState([]);
  const [isDragMode, setIsDragMode] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [originalData, setOriginalData] = useState([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [expandedLines, setExpandedLines] = useState([]);
  const [expandedAreas, setExpandedAreas] = useState({});
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [selectedBranchFromStorage, setSelectedBranchFromStorage] = useState(null);
  const [areasPagination, setAreasPagination] = useState({});
  const AREAS_PAGE_SIZE = 10;

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    const storedBranchName = localStorage.getItem("selected_branch_name");
    const accessToken = localStorage.getItem("access_token");

    setSelectedBranchFromStorage(storedBranchName);

    if (storedBranchName) {
      getSelectedColumn();
    }

    if (storedBranchName && accessToken) {
      getAreaList();
    } else {
      setTimeout(() => {
        const retryToken = localStorage.getItem("access_token");
        if (storedBranchName && retryToken) {
          getAreaList();
        }
      }, 300);
    }
  }, []);

  // Group data by line name
  const groupAreasByLine = (data) => {
    const grouped = {};
    data.forEach((area) => {
      const lineName = area.line_name || "Uncategorized";
      if (!grouped[lineName]) {
        grouped[lineName] = [];
      }
      grouped[lineName].push(area);
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
    const grouped = groupAreasByLine(originalData);
    
    const newPagination = {};
    Object.keys(grouped).forEach(lineName => {
      newPagination[lineName] = {
        displayed: Math.min(AREAS_PAGE_SIZE, grouped[lineName].length),
        total: grouped[lineName].length
      };
    });
    
    setTableData(originalData);
    setGroupedData(grouped);
    setAreasPagination(newPagination);
    
    setShowReset(false);
    setSelectedLine(null);
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
      const response = await POST(`${AREA}reorder/`, reorderedData);
      if (response?.status === 200) {
        const storedBranchName = localStorage.getItem("selected_branch_name");
        
        const reorderedIds = new Set(reorderedData.map(item => item.id));
        
        const updatedOriginalData = [
          ...originalData.filter(item => !reorderedIds.has(item.id)),
          ...reorderedData
        ];
        
        let finalData = updatedOriginalData;
        if (storedBranchName) {
          finalData = updatedOriginalData.filter(
            (item) => item.branch_name === storedBranchName
          );
        }
        
        setOriginalData(updatedOriginalData);
        setTableData(finalData);
        const grouped = groupAreasByLine(finalData);
        setGroupedData(grouped);
        
        const newPagination = {};
        Object.keys(grouped).forEach(lineName => {
          newPagination[lineName] = {
            displayed: Math.min(AREAS_PAGE_SIZE, grouped[lineName].length),
            total: grouped[lineName].length
          };
        });
        setAreasPagination(newPagination);
        
        setReorder(false);
        setRowReorderred(false);
        const filtered = header.filter(
          (item) => !["move", "order"].includes(item.value)
        );
        setTableHeader(filtered);
        setOrder({});
        setSelectedLine(null);
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
    const storedBranchName = localStorage.getItem("selected_branch_name");
    
    if (!storedBranchName) {
      notification.warning({
        message: "No Branch Selected",
        description: "Please select a branch from settings.",
      });
      return;
    }

    const filteredData = originalData.filter(
      (item) => item.branch_name === storedBranchName
    );

    if (filteredData.length === 0) {
      notification.warning({
        message: "No Areas Found",
        description: `No areas available for ${storedBranchName} branch.`,
      });
      return;
    }

    setShowReset(false);
    setSearchText("");

     const firstLineName = filteredData[0]?.line_name || storedBranchName;
    setSelectedLine(firstLineName);
    setTableData(filteredData);
    
    setTableHeader((prev) => {
      return [
        { label: "Move", value: "move" },
        { label: "Order", value: "order" },
        ...prev,
      ];
    });
    
    setReorder(true);
  };

  const getAreaList = async () => {
    try {
      setTableLoader(true);
      const response = await GET(AREA);
      if (response?.status === 200) {
        const storedBranchName = localStorage.getItem("selected_branch_name");
        
        let filteredData = response.data;
        if (storedBranchName) {
          filteredData = response.data.filter(
            (item) => item.branch_name === storedBranchName
          );
        }
        
        setTableData(filteredData);
        setOriginalData(filteredData);
        const grouped = groupAreasByLine(filteredData);
        setGroupedData(grouped);

        Object.keys(grouped).forEach(lineName => {
          initializeLinePagination(lineName, grouped[lineName].length);
        });

        const filterCol = ["line_name", "areaName"];
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
        
        if (storedBranchName) {
          const uniqueLines = [...new Set(filteredData.map((item) => item.line_name))];
          setExpandedLines(uniqueLines);
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

  const initializeLinePagination = (lineName, totalAreas) => {
    setAreasPagination(prev => ({
      ...prev,
      [lineName]: {
        displayed: Math.min(AREAS_PAGE_SIZE, totalAreas),
        total: totalAreas
      }
    }));
  };

  const loadMoreAreas = (lineName) => {
    setAreasPagination(prev => {
      const current = prev[lineName] || { displayed: 0, total: 0 };
      return {
        ...prev,
        [lineName]: {
          ...current,
          displayed: Math.min(current.displayed + AREAS_PAGE_SIZE, current.total)
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
    setSelectedLine(null);
    
    const storedBranchName = localStorage.getItem("selected_branch_name");
    if (storedBranchName) {
      const filteredData = originalData.filter(
        (item) => item.branch_name === storedBranchName
      );
      setTableData(filteredData);
      const grouped = groupAreasByLine(filteredData);
      setGroupedData(grouped);
      
      Object.keys(grouped).forEach(lineName => {
        initializeLinePagination(lineName, grouped[lineName].length);
      });
    } else {
      setTableData(originalData);
      setGroupedData(groupAreasByLine(originalData));
    }
    
    setSearchText("");
    setShowReset(false);
  };

  const onDelete = async (record) => {
    try {
      setDeleteLoader(true);
      const response = await DELETE(`${AREA}${record.id}/`);
      if (response?.status === 200) {
        const updatedData = tableData.filter((item) => item.id !== record.id);
        setTableData(updatedData);
        setGroupedData(groupAreasByLine(updatedData));
        notification.success({
          message: `${record?.areaName.toUpperCase()} Area Deleted!`,
          description: "The area has been deleted successfully",
          duration: 0,
        });
      } else {
        notification.error({
          message: "Area Delete",
          description: "The area is not deleted",
          duration: 0,
        });
      }
      setDeleteLoader(false);
      setShowConfirm(false);
    } catch (error) {
      setDeleteLoader(false);
      setShowConfirm(false);
      notification.error({
        message: "Area Deleted",
        description: "The area is not deleted",
        duration: 0,
      });
    }
  };

  const handleColumnChange = async (value) => {
    try {
      const res = await POST(COLUMNCHANGE, {
        entity: "area",
        columns: value,
      });
      setSelectedColumn(value);
      if (res.status === 200) {
        getAreaList();
      }
    } catch (error) {
      throw error;
    }
  };

  const getSelectedColumn = async () => {
    try {
      const res = await GET(SELECTEDCOLUMN);
      if (res.status === 200) {
        setSelectedColumn(res?.data?.area || []);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleAreaAction = (lineName, areaId) => {
    const key = `${lineName}-${areaId}`;
    setOpenSwipeId(null);
    setExpandedAreas((prev) => {
      const newState = {
        [key]: !prev[key]
      };
      
      if (newState[key]) {
        setTimeout(() => {
          const element = document.getElementById(`area-item-${areaId}`);
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

  const handleSwipeStateChange = (areaId, isOpen) => {
    if (isOpen) {
      setOpenSwipeId(areaId);
    } else if (openSwipeId === areaId) {
      setOpenSwipeId(null);
    }
  };

  const handleSearch = () => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      setTableData(originalData);
      const grouped = groupAreasByLine(originalData);
      setGroupedData(grouped);
      
      Object.keys(grouped).forEach(lineName => {
        initializeLinePagination(lineName, grouped[lineName].length);
      });
      
      setSearchModalVisible(false);
      setShowReset(false);
      notification.info({
        message: "Reset Search",
        description: "Showing all areas again.",
      });
      return;
    }

    const filtered = originalData.filter((item) => {
      const areaName = (item.areaName || "").toLowerCase();
      // const lineName = (item.line_name || "").toLowerCase();

      return areaName.includes(query)
    });

    setTableData(filtered);
    const grouped = groupAreasByLine(filtered);
    setGroupedData(grouped);
    
    Object.keys(grouped).forEach(lineName => {
      initializeLinePagination(lineName, grouped[lineName].length);
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
      title={<div style={{ textAlign: "center", width: "100%" }}>Search Area</div>}
      open={searchModalVisible}
      onOk={handleSearch}
      onCancel={() => setSearchModalVisible(false)}
      okText="Search"
    >
      <p style={{ marginBottom: 10, fontWeight: 500 }}>Area Name</p>
      <input
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Enter area name to search"
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

  const handleEditArea = (area) => navigate(`/area/edit/${area.id}`);

  return (
    <div className="page-content" style={{ padding: 0, margin: "0px 0px " }}>
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
        {reOrder ? (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>
              Reorder Areas
            </h2>
            <div style={{ fontSize: "14px", color: "#8c8c8c", marginTop: "4px" }}>
              Selected Line: <span style={{ color: "#1677ff", fontWeight: 500 }}>{selectedLine}</span>
            </div>
          </div>
        ) : (
          <h2 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>All Areas</h2>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {reOrder ? (
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

      {reOrder ? (
        <div>
          <Table
            data={tableData}
            reOrder={isDragMode}
            Header={
              isDragMode
                ? [
                    { label: "S.No", value: "index" },
                    { label: "Area Name", value: "areaName" },
                    { label: "Move", value: "move" },
                  ]
                : [
                    { label: "S.No", value: "index" },
                    { label: "Reorder", value: "order" },
                    { label: "Area Name", value: "areaName" },
                  ]
            }
            filterOption={filterOption}
            handleDragEnd={isDragMode ? handleDragEnd : undefined}
            handleReOrder={!isDragMode ? handleReOrder : undefined}
            deleteLoader={deleteLoader}
            setShowConfirm={setShowConfirm}
            showConfirm={showConfirm}
            name="area"
          />

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

          {Object.keys(groupedData).map((lineName) => {
            return (
              <div
                key={lineName}
                style={{
                  marginBottom: "12px",
                  border: "1px solid #e8e8e8",
                  borderRadius: "8px",
                  overflow: "hidden",
                  backgroundColor: "#fff"
                }}
              >
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
                    <Avatar src={lineIcon}>
                      {lineName?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <span style={{ fontWeight: 600, fontSize: "18px", color: "#262626" }}>
                      {lineName}
                    </span>
                  </div>
                  <Badge
                    count={groupedData[lineName].length}
                    style={{
                      backgroundColor: showReset ? "#1677ff" : "#52c41a",
                      fontWeight: 500,
                      boxShadow: "0 0 0 1px #fff"
                    }}
                  />
                </div>

                <div 
                  id={'scrollableDiv-' + lineName}
                  style={{ 
                    maxHeight: 400, 
                    overflow: "auto", 
                    padding: 0
                  }}
                >
                  <InfiniteScroll
                    dataLength={areasPagination[lineName]?.displayed || AREAS_PAGE_SIZE}
                    next={() => loadMoreAreas(lineName)}
                    hasMore={
                      (areasPagination[lineName]?.displayed || 0) < 
                      (areasPagination[lineName]?.total || 0)
                    }
                    loader={
                      <div style={{ textAlign: 'center', padding: '16px' }}>
                        <Skeleton avatar paragraph={{ rows: 1 }} active />
                      </div>
                    }
                    endMessage={
                      <Divider plain style={{ margin: "16px 0" }}>
                        <span style={{ color: "red", fontSize: "18px", fontWeight: "bold" }}>★ </span>
                        <span style={{ color: "#595959", fontSize: "14px" }}>
                          End of{" "}
                          <span style={{ fontWeight: 600, color: "#262626" }}>
                            {lineName}
                          </span> line{" "}
                          <span style={{ color: "red", fontSize: "18px", fontWeight: "bold" }}>★</span>
                        </span>
                      </Divider>
                    }
                    scrollableTarget={'scrollableDiv-' + lineName}
                  >
                    <List
                      dataSource={
                        groupedData[lineName].slice(
                          0, 
                          areasPagination[lineName]?.displayed || AREAS_PAGE_SIZE
                        )
                      }
                      style={{ background: "#fafafa", margin: 0 }}
                      renderItem={(area) => {
                        const isExpanded = expandedAreas[lineName + '-' + area.id];

                        return (
                          <div
                            key={area.id}
                            id={'area-item-' + area.id}
                            style={{
                              borderBottom: "2px solid #f0f0f0",
                              padding: 0,
                              background: "#fff",
                            }}
                          >
                            {isMobile ? (
                              <SwipeablePanel
                                item={area}
                                index={area.id}
                                titleKey="areaName"
                                name="area"
                                avatarSrc={areaIcon}
                                onSwipeRight={!isExpanded ? () => handleEditArea(area) : undefined}
                                onSwipeLeft={!isExpanded ? () => onDelete(area) : undefined}
                                isExpanded={isExpanded}
                                onExpandToggle={() => handleAreaAction(lineName, area.id)}
                                renderContent={() => (
                                  isExpanded ? (
                                    <AreaCollapseContent area={area} />
                                  ) : null
                                )}
                                isSwipeOpen={openSwipeId === area.id}
                                onSwipeStateChange={(isOpen) => handleSwipeStateChange(area.id, isOpen)}
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
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0
                                      }}>
                                        <img
                                          src={areaIcon}
                                          alt="area-icon"
                                          style={{
                                            width: "40px",
                                            height: "40px",
                                            objectFit: "contain"
                                          }}
                                        />
                                      </div>
                                    }
                                    title={
                                      <div
                                        onClick={() => handleAreaAction(lineName, area.id)}
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
                                          {area.areaName}
                                        </span>
                                        <Dropdown
                                          overlay={
                                            <Menu>
                                              <Menu.Item 
                                                key="edit"
                                                onClick={(e) => {
                                                  e.domEvent.stopPropagation();
                                                  handleEditArea(area);
                                                }}
                                              >
                                                Edit
                                              </Menu.Item>
                                              <Menu.Item 
                                                key="delete"
                                                danger 
                                                onClick={(e) => {
                                                  e.domEvent.stopPropagation();
                                                  onDelete(area);
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
                                    <AreaCollapseContent area={area} />
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
              <p>No areas found {showReset && searchText ? 'for "' + searchText + '"' : "for the selected branch"}</p>
            </div>
          )}
        </div>
      )}

      {!reOrder && (
        <FloatButton
          icon={<PlusOutlined />}
          type="primary"
          tooltip={<div>Add New Area</div>}
          onClick={() => navigate("/area/add")}
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

export default ViewArea;
