import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, notification, Grid, List, Avatar, Dropdown, Menu, Modal, Badge, Divider, Skeleton, FloatButton, Descriptions } from "antd";
import { DELETE, GET } from "helpers/api_helper";
import { INVESTMENT } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import SwipeablePanel from "components/Common/SwipeablePanel";
import { EllipsisOutlined, SearchOutlined, ReloadOutlined, PlusOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import lineIcon from "../../../assets/images/location.png";
import investmentIcon from "../../../assets/industrial-area.png"; // Add your investment icon
import InvestmentCollapsePanel from "components/Common/InvestmentCollapseContent";

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

  const handleReset = () => {
    const grouped = groupInvestmentsByLine(originalData);
    
    const newPagination = {};
    Object.keys(grouped).forEach(lineName => {
      newPagination[lineName] = {
        displayed: Math.min(INVESTMENTS_PAGE_SIZE, grouped[lineName].length),
        total: grouped[lineName].length
      };
    });
    
    setInvestments(originalData);
    setGroupedData(grouped);
    setInvestmentsPagination(newPagination);
    setExpandedLines({});
    
    setShowReset(false);
    setSearchText("");
    
    notification.success({
      message: "Data Reset",
      description: "Restored to the original view successfully.",
    });
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
        
        setInvestments(filteredData);
        setOriginalData(filteredData);
        const grouped = groupInvestmentsByLine(filteredData);
        setGroupedData(grouped);

        Object.keys(grouped).forEach(lineName => {
          initializeLinePagination(lineName, grouped[lineName].length);
        });
      } else {
        setInvestments([]);
        setOriginalData([]);
        setGroupedData({});
      }
    } catch (error) {
      setInvestments([]);
      setOriginalData([]);
      setGroupedData({});
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
    const query = searchText.trim().toLowerCase();

    if (!query) {
      setInvestments(originalData);
      const grouped = groupInvestmentsByLine(originalData);
      setGroupedData(grouped);
      
      Object.keys(grouped).forEach(lineName => {
        initializeLinePagination(lineName, grouped[lineName].length);
      });
      
      setExpandedLines({});
      setSearchModalVisible(false);
      setShowReset(false);
      notification.info({
        message: "Reset Search",
        description: "Showing all investments again.",
      });
      return;
    }

    const filtered = originalData.filter((item) => {
      const investmentTitle = (item.investment_title || "").toLowerCase();
      return investmentTitle.includes(query);
    });

    setInvestments(filtered);
    const grouped = groupInvestmentsByLine(filtered);
    setGroupedData(grouped);
    
    Object.keys(grouped).forEach(lineName => {
      initializeLinePagination(lineName, grouped[lineName].length);
    });
    
    setSearchModalVisible(false);
    setShowReset(true);

    if (filtered.length === 0) {
      setExpandedLines({});
      notification.warning({
        message: "No Results",
        description: `No matches found for "${searchText}".`,
      });
    } else {
      // Auto-expand all lines that have search results - do this AFTER state updates
      const expandedLinesObj = {};
      Object.keys(grouped).forEach(lineName => {
        expandedLinesObj[lineName] = true;
      });
      setExpandedLines(expandedLinesObj);
      
      notification.success({
        message: "Search Complete",
        description: `${filtered.length} result(s) found for "${searchText}".`,
      });
    }
  };

  const searchModal = (
    <Modal
      title={<div style={{ textAlign: "center", width: "100%" }}>Search Investment</div>}
      open={searchModalVisible}
      onOk={handleSearch}
      onCancel={() => setSearchModalVisible(false)}
      okText="Search"
    >
      <p style={{ marginBottom: 10, fontWeight: 500 }}>Investment Title</p>
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
        <h2 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>Investments</h2>

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
          const isLineExpanded = expandedLines[lineName];
          
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
                onClick={() => toggleLineExpansion(lineName)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  backgroundColor: isLineExpanded ? "#f5f5f5" : "#fff",
                  borderBottom: isLineExpanded ? "1px solid #e8e8e8" : "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s"
                }}
                onMouseEnter={(e) => {
                  if (!isLineExpanded) {
                    e.currentTarget.style.backgroundColor = "#fafafa";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLineExpanded) {
                    e.currentTarget.style.backgroundColor = "#fff";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar src={lineIcon}>
                    {lineName?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <span style={{ fontWeight: 600, fontSize: "18px", color: "#262626" }}>
                    {lineName}
                  </span>
                  {/* {isLineExpanded ? (
                    <UpOutlined style={{ fontSize: "12px", color: "#8c8c8c", marginLeft: "8px" }} />
                  ) : (
                    <DownOutlined style={{ fontSize: "12px", color: "#8c8c8c", marginLeft: "8px" }} />
                  )} */}
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

              {isLineExpanded && (
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
              )}
            </div>
          );
        })}

        {Object.keys(groupedData).length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "40px", color: "#8c8c8c" }}>
            <p>No investments found {showReset && searchText ? 'for "' + searchText + '"' : "for the selected branch"}</p>
          </div>
        )}
      </div>

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
