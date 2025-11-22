import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, notification, Grid, List, Avatar, Dropdown, Menu, Modal, Badge, Divider, Skeleton, FloatButton, Descriptions, Select, Radio, DatePicker } from "antd";
import { DELETE, GET } from "helpers/api_helper";
import { INVESTMENT } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import SwipeablePanel from "components/Common/SwipeablePanel";
import { EllipsisOutlined, SearchOutlined, ReloadOutlined, PlusOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import lineIcon from "../../../assets/images/location.png";
import investmentIcon from "../../../assets/industrial-area.png";
import InvestmentCollapsePanel from "components/Common/InvestmentCollapseContent";
import dayjs from 'dayjs';

import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { RangePicker } = DatePicker;
const { Option } = Select;

const InvestmentList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [originalData, setOriginalData] = useState([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [expandedInvestments, setExpandedInvestments] = useState({});
  const [expandedLines, setExpandedLines] = useState({});
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [selectedBranchFromStorage, setSelectedBranchFromStorage] = useState(null);
  const [investmentsPagination, setInvestmentsPagination] = useState({});
  const [firstLoad, setFirstLoad] = useState(true);
  const [hasSearched, setHasSearched] = useState(false); // New state to track if search was performed
  
  // Enhanced search filters
  const [selectedLine, setSelectedLine] = useState("");
  const [dateFilterType, setDateFilterType] = useState("all");
  const [dateRange, setDateRange] = useState([null, null]);
  const [searchCriteria, setSearchCriteria] = useState(null);
  
  const INVESTMENTS_PAGE_SIZE = 10;

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    const storedBranchName = localStorage.getItem("selected_branch_name");
    const accessToken = localStorage.getItem("access_token");

    setSelectedBranchFromStorage(storedBranchName);

    if (storedBranchName && accessToken) {
      getInvestmentList();
    } else {
      setTimeout(() => {
        const retryToken = localStorage.getItem("access_token");
        if (storedBranchName && retryToken) {
          getInvestmentList();
        }
      }, 300);
    }
  }, []);

  // Show modal on first load after data is fetched
  useEffect(() => {
    if (firstLoad && !loading && originalData.length > 0) {
      setSearchModalVisible(true);
      setFirstLoad(false);
    }
  }, [firstLoad, loading, originalData]);

  // Group data by line name
  const groupInvestmentsByLine = (data) => {
    const grouped = {};
    data.forEach((investment) => {
      const lineName = investment.line_name || "Uncategorized";
      if (!grouped[lineName]) {
        grouped[lineName] = [];
      }
      grouped[lineName].push(investment);
    });
    return grouped;
  };

  // Get unique line names for dropdown
  const getUniqueLines = () => {
    const lines = [...new Set(originalData.map(inv => inv.line_name || "Uncategorized"))];
    return lines.sort();
  };

  const handleReset = () => {
    // Clear the list when resetting
    setInvestments([]);
    setGroupedData({});
    setInvestmentsPagination({});
    
    setShowReset(false);
    setSearchText("");
    setSelectedLine("");
    setDateFilterType("all");
    setDateRange([null, null]);
    setSearchCriteria(null);
    setHasSearched(false); // Reset search status
    
    notification.success({
      message: "Data Reset",
      description: "Please perform a new search to view investments.",
    });
    
    // Show search modal after reset
    setTimeout(() => {
      setSearchModalVisible(true);
    }, 300);
  };

  const getInvestmentList = async () => {
    try {
      setLoading(true);
      const response = await GET(INVESTMENT);
      if (response?.status === 200) {
        const storedBranchName = localStorage.getItem("selected_branch_name");
        
        let filteredData = response.data;
        if (storedBranchName) {
          filteredData = response.data.filter(
            (item) => item.branch_name === storedBranchName
          );
        }
        
        // Don't set investments or groupedData yet - wait for search
        setOriginalData(filteredData);
      } else {
        setOriginalData([]);
      }
    } catch (error) {
      setOriginalData([]);
      notification.error({
        message: "Error",
        description: "Failed to load investments",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeLinePagination = (lineName, totalInvestments) => {
    setInvestmentsPagination(prev => ({
      ...prev,
      [lineName]: {
        displayed: Math.min(INVESTMENTS_PAGE_SIZE, totalInvestments),
        total: totalInvestments
      }
    }));
  };

  const loadMoreInvestments = (lineName) => {
    setInvestmentsPagination(prev => {
      const current = prev[lineName] || { displayed: 0, total: 0 };
      return {
        ...prev,
        [lineName]: {
          ...current,
          displayed: Math.min(current.displayed + INVESTMENTS_PAGE_SIZE, current.total)
        }
      };
    });
  };

  const handleDelete = async (record) => {
    try {
      const response = await DELETE(`${INVESTMENT}${record.id}/`);
      if (response?.status === 204 || response?.status === 200) {
        const updatedData = investments.filter((item) => item.id !== record.id);
        const updatedOriginalData = originalData.filter((item) => item.id !== record.id);
        
        setInvestments(updatedData);
        setOriginalData(updatedOriginalData);
        setGroupedData(groupInvestmentsByLine(updatedData));
        
        notification.success({
          message: `${record.investment_title.toUpperCase()} Investment Deleted!`,
          description: "The investment has been deleted successfully",
        });
      } else {
        notification.error({
          message: "Investment Delete",
          description: "The investment was not deleted",
        });
      }
    } catch (error) {
      notification.error({
        message: "Investment Deleted",
        description: "The investment was not deleted",
      });
    }
  };

  const toggleLineExpansion = (lineName) => {
    setExpandedLines((prev) => ({
      ...prev,
      [lineName]: !prev[lineName]
    }));
  };

  const handleInvestmentAction = (lineName, investmentId) => {
    const key = `${lineName}-${investmentId}`;
    setOpenSwipeId(null);
    setExpandedInvestments((prev) => {
      const newState = {
        [key]: !prev[key]
      };
      
      if (newState[key]) {
        setTimeout(() => {
          const element = document.getElementById(`investment-item-${investmentId}`);
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

  const handleSwipeStateChange = (investmentId, isOpen) => {
    if (isOpen) {
      setOpenSwipeId(investmentId);
    } else if (openSwipeId === investmentId) {
      setOpenSwipeId(null);
    }
  };

  const handleSearch = () => {
    // Validate: At least one search criteria must be provided
    const hasLineCriteria = selectedLine && selectedLine !== "";
    const hasDateCriteria = dateFilterType === "range" && dateRange[0] && dateRange[1];
    const hasTextCriteria = searchText.trim() !== "";

    if (!hasLineCriteria && !hasDateCriteria && !hasTextCriteria) {
      notification.warning({
        message: "Search Required",
        description: "Please select at least one search criteria (line, date range, or investment title).",
      });
      return;
    }

    let filtered = [...originalData];

    // Filter by line
    if (selectedLine && selectedLine !== "") {
      filtered = filtered.filter(item => 
        (item.line_name || "Uncategorized") === selectedLine
      );
    }

    // Filter by date range
    if (dateFilterType === "range" && dateRange[0] && dateRange[1]) {
      const fromDate = dayjs(dateRange[0]).startOf('day');
      const toDate = dayjs(dateRange[1]).endOf('day');
      
      filtered = filtered.filter(item => {
        const investmentDate = dayjs(item.created_date || item.investment_date);
        
        return (investmentDate.isAfter(fromDate) || investmentDate.isSame(fromDate)) && 
               (investmentDate.isBefore(toDate) || investmentDate.isSame(toDate));
      });
    }

    // Filter by investment title
    if (searchText.trim()) {
      const query = searchText.trim().toLowerCase();
      filtered = filtered.filter(item => {
        const investmentTitle = (item.investment_title || "").toLowerCase();
        return investmentTitle.includes(query);
      });
    }

    // Save search criteria for display
    const criteria = {
      line: selectedLine && selectedLine !== "" ? selectedLine : null,
      dateType: dateFilterType,
      fromDate: dateRange[0] ? dayjs(dateRange[0]).format('DD-MMM-YYYY') : null,
      toDate: dateRange[1] ? dayjs(dateRange[1]).format('DD-MMM-YYYY') : null,
      searchText: searchText.trim() || null
    };

    setSearchCriteria(criteria);
    setInvestments(filtered);
    const grouped = groupInvestmentsByLine(filtered);
    setGroupedData(grouped);
    
    Object.keys(grouped).forEach(lineName => {
      initializeLinePagination(lineName, grouped[lineName].length);
    });
    
    setSearchModalVisible(false);
    setShowReset(true);
    setHasSearched(true); // Mark that search has been performed

    if (filtered.length === 0) {
      notification.warning({
        message: "No Results",
        description: "No investments found matching your search criteria.",
      });
    } else {
      // Auto-expand all lines
      const expandedLinesObj = {};
      Object.keys(grouped).forEach(lineName => {
        expandedLinesObj[lineName] = true;
      });
      setExpandedLines(expandedLinesObj);
      
      notification.success({
        message: "Search Complete",
        description: `${filtered.length} result(s) found.`,
      });
    }
  };

  const getSearchCriteriaDisplay = () => {
    if (!searchCriteria) return null;

    const parts = [];
    
    if (searchCriteria.line) {
      parts.push(`Line: ${searchCriteria.line}`);
    }
    
    if (searchCriteria.dateType === "range" && searchCriteria.fromDate && searchCriteria.toDate) {
      parts.push(`Date: ${searchCriteria.fromDate} to ${searchCriteria.toDate}`);
    } else if (searchCriteria.dateType === "all") {
      parts.push("Date: All");
    }
    
    if (searchCriteria.searchText) {
      parts.push(`Pattern: "${searchCriteria.searchText}"`);
    }

    return parts.join(" | ");
  };

  const searchModal = (
    <Modal
      title={<div style={{ textAlign: "center", width: "100%" }}>Search Investment</div>}
      open={searchModalVisible}
      onOk={handleSearch}
      onCancel={hasSearched ? () => setSearchModalVisible(false) : undefined}
      okText="Search"
      cancelText="Cancel"
      cancelButtonProps={{ style: hasSearched ? {} : { display: 'none' } }}
      width={600}
      closable={hasSearched}
      maskClosable={hasSearched}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
       
        {/* 1. Select Line */}
        <div>
          <p style={{ marginBottom: 8, fontWeight: 500 }}>Select Line:</p>
          <Select
            value={selectedLine === "" ? undefined : selectedLine}
            onChange={setSelectedLine}
            style={{ width: "100%" }}
            placeholder="Select a line"
            allowClear
          >
            {getUniqueLines().map(line => (
              <Option key={line} value={line}>{line}</Option>
            ))}
          </Select>
        </div>

        {/* 2. Date Filter */}
        <div>
          <p style={{ marginBottom: 8, fontWeight: 500 }}>Date Filter:</p>
          <Radio.Group 
            value={dateFilterType} 
            onChange={(e) => {
              setDateFilterType(e.target.value);
              if (e.target.value === "all") {
                setDateRange([null, null]);
              }
            }}
            style={{ marginBottom: 12 }}
          >
            <Radio value="all">Show All</Radio>
            <Radio value="range">Date Range</Radio>
          </Radio.Group>

          {dateFilterType === "range" && (
            <div style={{ 
              padding: "12px", 
              backgroundColor: "#f5f5f5", 
              borderRadius: "6px",
              border: "1px solid #d9d9d9"
            }}>
              <p style={{ marginBottom: 8, fontSize: "13px", color: "#595959" }}>
                Select date range:
              </p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <DatePicker
                  value={dateRange[0]}
                  onChange={(date) => setDateRange([date, dateRange[1]])}
                  style={{ flex: 1 }}
                  format="DD-MMM-YYYY"
                  placeholder="From Date"
                  disabledDate={(current) => {
                    const today = dayjs().endOf('day');
                    if (current && current.isAfter(today)) {
                      return true;
                    }
                    return dateRange[1] && current && current.isAfter(dateRange[1], 'day');
                  }}
                />
                <span style={{ color: "#8c8c8c" }}>to</span>
                <DatePicker
                  value={dateRange[1]}
                  onChange={(date) => setDateRange([dateRange[0], date])}
                  style={{ flex: 1 }}
                  format="DD-MMM-YYYY"
                  placeholder="To Date"
                  disabledDate={(current) => {
                    const today = dayjs().endOf('day');
                    if (current && current.isAfter(today)) {
                      return true;
                    }
                    return dateRange[0] && current && current.isBefore(dateRange[0], 'day');
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Investment Title */}
        <div>
          <p style={{ marginBottom: 8, fontWeight: 500 }}>Investment Title:</p>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Enter investment title to search"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #d9d9d9",
              outline: "none",
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        </div>

       
      </div>
    </Modal>
  );

  const handleEditInvestment = (investment) => navigate(`/investment/edit/${investment.id}`);

  return (
    <div className="page-content" style={{ padding: 0, margin: "0px 0px" }}>
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
        <h2 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>Investment List</h2>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Button
            icon={<SearchOutlined />}
            onClick={() => setSearchModalVisible(true)}
            type="default"
          >
            {!isMobile && "Search"}
          </Button>
          {showReset && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              title="Reset to Original"
            />
          )}
        </div>
      </div>
      {searchModal}

      {loading && <Loader />}

      {/* Only show the list if search has been performed */}
      {hasSearched && (
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
          {showReset && searchCriteria && (
            <div
              style={{
                padding: "12px 16px",
                marginBottom: "16px",
                backgroundColor: "#f0f5ff",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap"
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "13px", color: "#595959", marginRight: "8px" }}>
                  Search Results:
                </span>
                <div style={{ 
                  fontSize: "14px", 
                  color: "#1677ff",
                  fontWeight: 500,
                  marginTop: "4px"
                }}>
                  {getSearchCriteriaDisplay()}
                </div>
              </div>
              <Badge 
                count={Object.values(groupedData).flat().length}
                style={{
                  backgroundColor: "#52c41a",
                  fontWeight: 600,
                  boxShadow: "0 2px 8px rgba(82, 196, 26, 0.3)"
                }}
              />
            </div>
          )}

          {Object.keys(groupedData).map((lineName) => {
            const isLineExpanded = true;
            
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
                    borderBottom: "1px solid #e8e8e8",
                    cursor: "default",
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
                    dataLength={investmentsPagination[lineName]?.displayed || INVESTMENTS_PAGE_SIZE}
                    next={() => loadMoreInvestments(lineName)}
                    hasMore={
                      (investmentsPagination[lineName]?.displayed || 0) < 
                      (investmentsPagination[lineName]?.total || 0)
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
                          investmentsPagination[lineName]?.displayed || INVESTMENTS_PAGE_SIZE
                        )
                      }
                      style={{ background: "#fafafa", margin: 0 }}
                      renderItem={(investment) => {
                        const isExpanded = expandedInvestments[lineName + '-' + investment.id];

                        return (
                          <div
                            key={investment.id}
                            id={'investment-item-' + investment.id}
                            style={{
                              borderBottom: "2px solid #f0f0f0",
                              padding: 0,
                              background: "#fff",
                            }}
                          >
                            {isMobile ? (
                              <SwipeablePanel
                                item={investment}
                                index={investment.id}
                                titleKey="investment_title"
                                name="investment"
                                avatarSrc={investmentIcon}
                                onSwipeRight={!isExpanded ? () => handleEditInvestment(investment) : undefined}
                                onSwipeLeft={!isExpanded ? () => handleDelete(investment) : undefined}
                                isExpanded={isExpanded}
                                onExpandToggle={() => handleInvestmentAction(lineName, investment.id)}
                                renderContent={() => (
                                  isExpanded ? (
                                    <InvestmentCollapsePanel investment={investment} />
                                  ) : null
                                )}
                                isSwipeOpen={openSwipeId === investment.id}
                                onSwipeStateChange={(isOpen) => handleSwipeStateChange(investment.id, isOpen)}
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
                                          src={investmentIcon}
                                          alt="investment-icon"
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
                                        onClick={() => handleInvestmentAction(lineName, investment.id)}
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
                                          {investment.investment_title}
                                        </span>
                                        <Dropdown
                                          overlay={
                                            <Menu>
                                              <Menu.Item 
                                                key="edit"
                                                onClick={(e) => {
                                                  e.domEvent.stopPropagation();
                                                  handleEditInvestment(investment);
                                                }}
                                              >
                                                Edit
                                              </Menu.Item>
                                              <Menu.Item 
                                                key="delete"
                                                danger 
                                                onClick={(e) => {
                                                  e.domEvent.stopPropagation();
                                                  handleDelete(investment);
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
                                    <InvestmentCollapsePanel investment={investment} />
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

          {Object.keys(groupedData).length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "40px", color: "#8c8c8c" }}>
              <p>No investments found matching your search criteria</p>
            </div>
          )}
        </div>
      )}

      {/* Show message when no search has been performed */}
      {!hasSearched && !loading && (
        <div style={{ 
          textAlign: "center", 
          padding: "60px 20px", 
          color: "#8c8c8c",
          // backgroundColor: "#fafafa",
          borderRadius: "8px",
          margin: "20px 10px"
        }}>
          <SearchOutlined style={{ fontSize: "48px", color: "#d9d9d9", marginBottom: "16px" }} />
          <p style={{ fontSize: "16px", fontWeight: 500, marginBottom: "8px" }}>No Search Performed</p>
          <p style={{ fontSize: "14px" }}>Please use the Search button to filter and view investments.</p>
        </div>
      )}

      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        tooltip={<div>Add New Investment</div>}
        onClick={() => navigate("/investment/add")}
        style={{
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          position: "fixed",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
};

export default InvestmentList;
